import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'
import { chunkText } from './chunker'
import { HttpPageFetcher, PageFetcher } from './page-fetcher'
import { CrawledPage, SiteCrawler } from './site-crawler'
import { normalizeWhitespace } from './html-extract'

const TICK_INTERVAL_MS = 60 * 1000
const RECRAWL_AFTER_MS = 7 * 24 * 60 * 60 * 1000
/** A 'crawling' claim older than this is assumed dead (process restarted mid-crawl) */
const STALE_CRAWL_MS = 3 * 60 * 60 * 1000
const DEFAULT_PAGE_LIMIT = 50

type SourceWithAssistant = {
  id: string
  source_type: string
  source_url: string | null
  source_label: string
  raw_text: string | null
  assistant: { tenant_id: string; domains: { hostname: string; verification_status: string }[] }
}

/**
 * Background indexer for website knowledge. Uses DB-claimed jobs (crawl_status)
 * rather than Redis queues, which are evicted under shared-host memory pressure.
 */
@Injectable()
export class KnowledgeIndexService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(KnowledgeIndexService.name)
  private timer?: ReturnType<typeof setInterval>
  private running = false
  private readonly crawler: SiteCrawler

  constructor(private readonly prisma: PrismaClient, fetcher?: PageFetcher, private readonly delayMs = 1000) {
    this.crawler = new SiteCrawler(fetcher ?? new HttpPageFetcher())
  }

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), TICK_INTERVAL_MS)
    this.timer.unref?.()
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer)
  }

  /** Mark a source for (re)indexing; the next tick picks it up. */
  async enqueue(sourceId: string): Promise<void> {
    await this.prisma.websiteKnowledgeSource.update({
      where: { id: sourceId },
      data: { crawl_status: 'queued', last_error: null },
    })
  }

  async tick(now: Date = new Date()): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.prisma.websiteKnowledgeSource.updateMany({
        where: {
          OR: [
            { crawl_status: 'crawling', updated_at: { lt: new Date(now.getTime() - STALE_CRAWL_MS) } },
            { crawl_status: 'ready', source_type: 'website', is_enabled: true, last_crawled_at: { lt: new Date(now.getTime() - RECRAWL_AFTER_MS) } },
          ],
        },
        data: { crawl_status: 'queued' },
      })

      const next = await this.prisma.websiteKnowledgeSource.findFirst({
        where: { crawl_status: 'queued', is_enabled: true },
        orderBy: { updated_at: 'asc' },
        select: { id: true },
      })
      if (!next) return

      const claimed = await this.prisma.websiteKnowledgeSource.updateMany({
        where: { id: next.id, crawl_status: 'queued' },
        data: { crawl_status: 'crawling' },
      })
      if (claimed.count !== 1) return

      await this.processSource(next.id)
    } catch (err) {
      this.logger.error(`Knowledge tick failed: ${(err as Error).message}`)
    } finally {
      this.running = false
    }
  }

  async processSource(sourceId: string): Promise<void> {
    const source = (await this.prisma.websiteKnowledgeSource.findUnique({
      where: { id: sourceId },
      include: { assistant: { select: { tenant_id: true, domains: { select: { hostname: true, verification_status: true } } } } },
    })) as SourceWithAssistant | null
    if (!source) return

    try {
      const pages = source.source_type === 'text'
        ? [{ url: `text://${source.id}`, title: source.source_label, text: normalizeWhitespace(source.raw_text ?? '') }]
        : await this.crawlWebsite(source)

      if (!pages.length) throw new Error('No readable pages found. If the site needs JavaScript to show content, add it as pasted text instead.')

      const seen = new Set<string>()
      for (const page of pages) {
        seen.add(page.url)
        await this.indexPage(source.assistant.tenant_id, source.id, page)
      }

      // Pages that disappeared from the site stop being used for answers
      await this.prisma.knowledgeDocument.deleteMany({ where: { source_id: source.id, url: { notIn: [...seen] } } })

      const indexed = await this.prisma.knowledgeDocument.count({ where: { source_id: source.id, status: 'indexed' } })
      await this.prisma.websiteKnowledgeSource.update({
        where: { id: source.id },
        data: { crawl_status: 'ready', last_crawled_at: new Date(), pages_indexed: indexed, last_error: null },
      })
      this.logger.log(`Indexed ${indexed} page(s) for knowledge source ${source.id}`)
    } catch (err) {
      await this.prisma.websiteKnowledgeSource.update({
        where: { id: source.id },
        data: { crawl_status: 'failed', last_crawled_at: new Date(), last_error: (err as Error).message.slice(0, 500) },
      })
      this.logger.warn(`Knowledge source ${source.id} failed: ${(err as Error).message}`)
    }
  }

  private async crawlWebsite(source: SourceWithAssistant): Promise<CrawledPage[]> {
    if (!source.source_url) throw new Error('Website source has no URL')
    const verified = new Set(
      source.assistant.domains.filter((d) => d.verification_status === 'verified').map((d) => d.hostname.toLowerCase()),
    )
    const host = new URL(source.source_url).hostname.toLowerCase()
    if (!verified.has(host)) throw new Error(`${host} is not a verified domain for this assistant`)

    const result = await this.crawler.crawl({
      startUrl: source.source_url,
      allowedHosts: new Set([host]),
      maxPages: await this.pageLimit(source.assistant.tenant_id),
      delayMs: this.delayMs,
    })
    if (result.failures.length) {
      this.logger.debug(`Crawl of ${host}: ${result.pages.length} pages, ${result.failures.length} skipped`)
    }
    return result.pages
  }

  private async indexPage(tenantId: string, sourceId: string, page: CrawledPage): Promise<void> {
    const hash = createHash('sha256').update(`${page.title ?? ''}\n${page.text}`).digest('hex')
    const existing = await this.prisma.knowledgeDocument.findUnique({
      where: { source_id_url: { source_id: sourceId, url: page.url } },
      select: { id: true, content_hash: true, status: true },
    })
    if (existing && existing.content_hash === hash && existing.status === 'indexed') {
      await this.prisma.knowledgeDocument.update({ where: { id: existing.id }, data: { fetched_at: new Date() } })
      return
    }

    const chunks = chunkText(page.text, { title: page.title })
    const doc = await this.prisma.knowledgeDocument.upsert({
      where: { source_id_url: { source_id: sourceId, url: page.url } },
      create: { tenant_id: tenantId, source_id: sourceId, url: page.url, title: page.title, content_hash: hash, status: 'indexed', fetched_at: new Date() },
      update: { title: page.title, content_hash: hash, status: 'indexed', error: null, fetched_at: new Date() },
    })
    await this.prisma.$transaction([
      this.prisma.knowledgeChunk.deleteMany({ where: { document_id: doc.id } }),
      this.prisma.knowledgeChunk.createMany({
        data: chunks.map((c, i) => ({ tenant_id: tenantId, document_id: doc.id, ordinal: i, text: c.text, token_count: c.tokenCount })),
      }),
    ])
  }

  private async pageLimit(tenantId: string): Promise<number> {
    const sub = await this.prisma.subscription.findUnique({ where: { tenant_id: tenantId }, select: { plan_tier: true } })
    if (!sub) return DEFAULT_PAGE_LIMIT
    const plan = await this.prisma.plan.findUnique({ where: { tier: sub.plan_tier }, select: { knowledge_page_limit: true } }).catch(() => null)
    return plan?.knowledge_page_limit ?? DEFAULT_PAGE_LIMIT
  }
}
