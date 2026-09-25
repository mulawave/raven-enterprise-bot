import { KnowledgeIndexService } from './knowledge-index.service'
import { KnowledgeRetriever } from './knowledge-retriever'
import { FetchedPage, PageFetcher } from './page-fetcher'

class StaticSite implements PageFetcher {
  constructor(private readonly pages: Record<string, string>) {}
  async fetch(url: string): Promise<FetchedPage | null> {
    const html = this.pages[url]
    return html
      ? { url, status: 200, contentType: 'text/html', body: html }
      : { url, status: 404, contentType: 'text/html', body: '' }
  }
}

function makePrisma() {
  return {
    websiteKnowledgeSource: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    knowledgeDocument: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(async ({ create }: any) => ({ id: `doc-${create.url}`, ...create })),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn().mockResolvedValue(2),
    },
    knowledgeChunk: { deleteMany: jest.fn((a: any) => a), createMany: jest.fn((a: any) => a) },
    subscription: { findUnique: jest.fn().mockResolvedValue({ plan_tier: 'starter' }) },
    plan: { findUnique: jest.fn().mockResolvedValue({ knowledge_page_limit: 50 }) },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
  }
}

const page = (title: string, text: string) => `<html><head><title>${title}</title></head><body><main><p>${text}</p></main></body></html>`

describe('KnowledgeIndexService', () => {
  const websiteSource = {
    id: 'src-1',
    source_type: 'website',
    source_url: 'https://shop.ng/',
    source_label: 'shop.ng',
    raw_text: null,
    assistant: { tenant_id: 'tenant-1', domains: [{ hostname: 'shop.ng', verification_status: 'verified' }] },
  }

  it('crawls a verified site, stores chunks per page and marks the source ready', async () => {
    const prisma = makePrisma()
    prisma.websiteKnowledgeSource.findUnique.mockResolvedValue(websiteSource)
    const site = new StaticSite({
      'https://shop.ng/': page('Home', 'We sell fresh jollof rice, fried plantain and grilled chicken every single day from our kitchen in Lekki Phase 1. <a href="/delivery">Delivery</a>'),
      'https://shop.ng/delivery': page('Delivery', 'Delivery within Lekki costs ₦1,500 and takes about 45 minutes on weekdays.'),
    })
    const service = new KnowledgeIndexService(prisma as any, site, 0)

    await service.processSource('src-1')

    const urls = prisma.knowledgeDocument.upsert.mock.calls.map((c: any) => c[0].create.url)
    expect(urls.sort()).toEqual(['https://shop.ng/', 'https://shop.ng/delivery'])
    const chunkRows = prisma.knowledgeChunk.createMany.mock.calls.flatMap((c: any) => c[0].data)
    expect(chunkRows.every((r: any) => r.tenant_id === 'tenant-1')).toBe(true)
    expect(chunkRows.some((r: any) => r.text.includes('₦1,500'))).toBe(true)
    expect(prisma.knowledgeDocument.deleteMany).toHaveBeenCalledWith({
      where: { source_id: 'src-1', url: { notIn: expect.arrayContaining(['https://shop.ng/', 'https://shop.ng/delivery']) } },
    })
    expect(prisma.websiteKnowledgeSource.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ crawl_status: 'ready', pages_indexed: 2, last_error: null }),
    }))
  })

  it('skips re-chunking pages whose content has not changed', async () => {
    const prisma = makePrisma()
    prisma.websiteKnowledgeSource.findUnique.mockResolvedValue({ ...websiteSource, source_url: 'https://shop.ng/about' })
    const html = page('About', 'Family-run kitchen serving Lagos since 2012 with home-style Nigerian dishes, cooked fresh every morning.')
    const service = new KnowledgeIndexService(prisma as any, new StaticSite({ 'https://shop.ng/about': html }), 0)

    await service.processSource('src-1')
    const firstHash = prisma.knowledgeDocument.upsert.mock.calls[0][0].create.content_hash
    prisma.knowledgeDocument.findUnique.mockResolvedValue({ id: 'doc-1', content_hash: firstHash, status: 'indexed' })
    prisma.knowledgeChunk.createMany.mockClear()

    await service.processSource('src-1')

    expect(prisma.knowledgeChunk.createMany).not.toHaveBeenCalled()
  })

  it('refuses to crawl a domain that is not verified', async () => {
    const prisma = makePrisma()
    prisma.websiteKnowledgeSource.findUnique.mockResolvedValue({
      ...websiteSource,
      assistant: { tenant_id: 'tenant-1', domains: [{ hostname: 'shop.ng', verification_status: 'pending' }] },
    })
    const site = new StaticSite({})
    const fetchSpy = jest.spyOn(site, 'fetch')

    await new KnowledgeIndexService(prisma as any, site, 0).processSource('src-1')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(prisma.websiteKnowledgeSource.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ crawl_status: 'failed', last_error: expect.stringContaining('not a verified domain') }),
    }))
  })

  it('indexes pasted text sources without any network access', async () => {
    const prisma = makePrisma()
    prisma.websiteKnowledgeSource.findUnique.mockResolvedValue({
      ...websiteSource,
      source_type: 'text',
      source_url: null,
      source_label: 'Returns policy',
      raw_text: 'Items can be returned within 7 days with the receipt.',
    })
    const site = new StaticSite({})
    const fetchSpy = jest.spyOn(site, 'fetch')

    await new KnowledgeIndexService(prisma as any, site, 0).processSource('src-1')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(prisma.knowledgeDocument.upsert.mock.calls[0][0].create).toMatchObject({ url: 'text://src-1', title: 'Returns policy' })
  })

  it('claims one queued source per tick and never runs two ticks at once', async () => {
    const prisma = makePrisma()
    prisma.websiteKnowledgeSource.findFirst.mockResolvedValue({ id: 'src-1' })
    const service = new KnowledgeIndexService(prisma as any, new StaticSite({}), 0)
    const processSpy = jest.spyOn(service, 'processSource').mockImplementation(() => new Promise((r) => setTimeout(r, 20)))

    await Promise.all([service.tick(), service.tick()])

    expect(processSpy).toHaveBeenCalledTimes(1)
    expect(prisma.websiteKnowledgeSource.updateMany).toHaveBeenCalledWith({
      where: { id: 'src-1', crawl_status: 'queued' },
      data: { crawl_status: 'crawling' },
    })
  })
})

describe('KnowledgeRetriever', () => {
  const rows = [
    { id: 'c1', text: 'Delivery within Lekki costs ₦1,500', title: 'Delivery', url: 'https://shop.ng/delivery', rank: 1.0 },
    { id: 'c2', text: 'Delivery takes 45 minutes', title: 'Delivery', url: 'https://shop.ng/delivery', rank: 0.8 },
    { id: 'c3', text: 'Another delivery note', title: 'Delivery', url: 'https://shop.ng/delivery', rank: 0.7 },
    { id: 'c4', text: 'Returns within 7 days', title: 'Returns policy', url: 'text://src-2', rank: 0.5 },
    { id: 'c5', text: 'Unrelated footer text', title: 'Home', url: 'https://shop.ng/', rank: 0.05 },
  ]

  it('limits chunks per page, drops weak matches and hides pasted-text URLs', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue(rows) }
    const passages = await new KnowledgeRetriever(prisma as any).search('tenant-1', 'How much is delivery to Lekki?')

    expect(passages.map((p) => p.chunkId)).toEqual(['c1', 'c2', 'c4'])
    expect(passages[2].url).toBeNull()
  })

  it('scopes the query to the tenant', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([]) }
    await new KnowledgeRetriever(prisma as any).search('tenant-42', 'delivery price')

    const values = prisma.$queryRaw.mock.calls[0].slice(1)
    expect(values).toContain('tenant-42')
    expect(values.find((v: unknown) => typeof v === 'string' && v.includes(' or '))).toEqual(expect.stringContaining('delivery'))
  })

  it('never throws into the reply path', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('relation does not exist')) }
    await expect(new KnowledgeRetriever(prisma as any).search('t', 'delivery')).resolves.toEqual([])
  })

  it('skips the database for messages with nothing to search', async () => {
    const prisma = { $queryRaw: jest.fn() }
    await expect(new KnowledgeRetriever(prisma as any).search('t', 'hi')).resolves.toEqual([])
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
  })
})
