import { extractPage } from './html-extract'
import { PageFetcher } from './page-fetcher'
import { ALLOW_ALL, parseRobots, RobotsRules } from './robots'

export interface CrawledPage {
  url: string
  title: string | null
  text: string
}

export interface CrawlResult {
  pages: CrawledPage[]
  failures: { url: string; reason: string }[]
}

export interface CrawlOptions {
  startUrl: string
  allowedHosts: Set<string>
  maxPages: number
  maxDepth?: number
  /** Politeness delay between requests (ms). Tests pass 0. */
  delayMs?: number
}

const SKIP_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|ico|css|js|json|zip|rar|gz|mp3|mp4|mov|avi|woff2?|ttf|eot|pdf|docx?|xlsx?|pptx?)$/i
const MIN_TEXT_CHARS = 40
const MAX_SITEMAPS = 5

/**
 * Crawl a verified website: robots.txt → sitemap(s) → breadth-first links.
 * Stays on allowedHosts, respects robots, and stops at maxPages useful pages.
 */
export class SiteCrawler {
  constructor(private readonly fetcher: PageFetcher) {}

  async crawl(opts: CrawlOptions): Promise<CrawlResult> {
    const maxDepth = opts.maxDepth ?? 4
    const delayMs = opts.delayMs ?? 1000
    const start = new URL(opts.startUrl)
    const origin = start.origin

    const robots = await this.loadRobots(origin, opts.allowedHosts)
    await this.pause(delayMs)
    const sitemapUrls = await this.loadSitemapUrls(origin, robots, opts.allowedHosts, opts.maxPages * 2, delayMs)

    const queue: { url: string; depth: number }[] = [{ url: normalizeUrl(start.toString()), depth: 0 }]
    for (const url of sitemapUrls) queue.push({ url, depth: 1 })

    const seen = new Set<string>()
    const pages: CrawledPage[] = []
    const failures: { url: string; reason: string }[] = []
    const maxAttempts = opts.maxPages * 3

    let attempts = 0
    while (queue.length && pages.length < opts.maxPages && attempts < maxAttempts) {
      const { url, depth } = queue.shift()!
      if (seen.has(url)) continue
      seen.add(url)
      if (!this.isCrawlable(url, opts.allowedHosts, robots)) continue

      attempts++
      if (attempts > 1) await this.pause(delayMs)

      const res = await this.fetcher.fetch(url, opts.allowedHosts)
      if (!res) {
        failures.push({ url, reason: 'unreachable' })
        continue
      }
      if (res.status >= 400) {
        failures.push({ url, reason: `HTTP ${res.status}` })
        continue
      }
      if (!/html|xml\+xhtml|text\/plain/i.test(res.contentType)) continue

      const finalUrl = normalizeUrl(res.url)
      if (finalUrl !== url) {
        if (seen.has(finalUrl)) continue
        seen.add(finalUrl)
      }

      const extracted = /text\/plain/i.test(res.contentType)
        ? { title: null, text: res.body.trim(), links: [] }
        : extractPage(res.body, finalUrl)

      if (extracted.text.length >= MIN_TEXT_CHARS) {
        pages.push({ url: finalUrl, title: extracted.title, text: extracted.text })
      } else {
        failures.push({ url: finalUrl, reason: 'no readable text (page may need JavaScript)' })
      }

      if (depth < maxDepth) {
        for (const link of extracted.links) {
          const normalized = normalizeUrl(link)
          if (!seen.has(normalized)) queue.push({ url: normalized, depth: depth + 1 })
        }
      }
    }

    return { pages, failures }
  }

  private isCrawlable(url: string, allowedHosts: Set<string>, robots: RobotsRules): boolean {
    let parsed: URL
    try { parsed = new URL(url) } catch { return false }
    if (!allowedHosts.has(parsed.hostname.toLowerCase())) return false
    if (SKIP_EXTENSIONS.test(parsed.pathname)) return false
    return robots.isAllowed(parsed.pathname + parsed.search)
  }

  private async loadRobots(origin: string, allowedHosts: Set<string>): Promise<RobotsRules> {
    const res = await this.fetcher.fetch(`${origin}/robots.txt`, allowedHosts)
    if (!res || res.status >= 400) return ALLOW_ALL
    return parseRobots(res.body)
  }

  private async loadSitemapUrls(origin: string, robots: RobotsRules, allowedHosts: Set<string>, cap: number, delayMs: number): Promise<string[]> {
    const pending = robots.sitemaps.length ? [...robots.sitemaps] : [`${origin}/sitemap.xml`]
    const urls: string[] = []
    let fetched = 0

    while (pending.length && fetched < MAX_SITEMAPS && urls.length < cap) {
      const sitemapUrl = pending.shift()!
      fetched++
      if (fetched > 1) await this.pause(delayMs)
      const res = await this.fetcher.fetch(sitemapUrl, allowedHosts).catch(() => null)
      if (!res || res.status >= 400) continue

      const locs = [...res.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decodeXml(m[1]))
      if (/<sitemapindex/i.test(res.body)) {
        pending.push(...locs)
      } else {
        for (const loc of locs) {
          if (urls.length >= cap) break
          urls.push(normalizeUrl(loc))
        }
      }
    }
    return urls
  }

  private pause(ms: number) {
    return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve()
  }
}

/** Canonical form for de-duplication: no fragment, no trailing slash (except root), sorted query */
export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw)
    url.hash = ''
    url.hostname = url.hostname.toLowerCase()
    url.searchParams.sort()
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^fbclid$|^gclid$/i.test(key)) url.searchParams.delete(key)
    }
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1)
    return url.toString()
  } catch {
    return raw
  }
}

function decodeXml(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}
