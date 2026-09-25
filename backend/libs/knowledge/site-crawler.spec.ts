import { FetchedPage, PageFetcher } from './page-fetcher'
import { SiteCrawler } from './site-crawler'

const body = (text: string, links: string[] = []) =>
  `<html><head><title>${text.slice(0, 20)}</title></head><body><main><p>${text}</p>${links.map((l) => `<a href="${l}">x</a>`).join('')}</main></body></html>`

const long = (s: string) => `${s} `.repeat(20)

class FakeSite implements PageFetcher {
  requested: string[] = []
  constructor(private readonly pages: Record<string, { status?: number; type?: string; body: string; redirect?: string }>) {}
  async fetch(url: string, allowedHosts: Set<string>): Promise<FetchedPage | null> {
    this.requested.push(url)
    if (!allowedHosts.has(new URL(url).hostname)) return null
    const page = this.pages[url]
    if (!page) return { url, status: 404, contentType: 'text/html', body: '' }
    return { url: page.redirect ?? url, status: page.status ?? 200, contentType: page.type ?? 'text/html', body: page.body }
  }
}

describe('SiteCrawler', () => {
  const hosts = new Set(['shop.ng'])

  it('follows links on the same host, respects robots and ignores other hosts', async () => {
    const site = new FakeSite({
      'https://shop.ng/robots.txt': { type: 'text/plain', body: 'User-agent: *\nDisallow: /admin' },
      'https://shop.ng/': { body: body(long('Welcome to our shop'), ['/menu', '/admin/panel', 'https://evil.com/x', '/logo.png']) },
      'https://shop.ng/menu': { body: body(long('Jollof rice ₦3,000'), ['/']) },
      'https://shop.ng/admin/panel': { body: body(long('secret')) },
    })

    const result = await new SiteCrawler(site).crawl({ startUrl: 'https://shop.ng/', allowedHosts: hosts, maxPages: 10, delayMs: 0 })

    expect(result.pages.map((p) => p.url).sort()).toEqual(['https://shop.ng/', 'https://shop.ng/menu'])
    expect(site.requested).not.toContain('https://shop.ng/admin/panel')
    expect(site.requested).not.toContain('https://evil.com/x')
    expect(site.requested).not.toContain('https://shop.ng/logo.png')
  })

  it('seeds from sitemap indexes', async () => {
    const site = new FakeSite({
      'https://shop.ng/robots.txt': { type: 'text/plain', body: 'Sitemap: https://shop.ng/sitemap_index.xml' },
      'https://shop.ng/sitemap_index.xml': { type: 'application/xml', body: '<sitemapindex><sitemap><loc>https://shop.ng/pages.xml</loc></sitemap></sitemapindex>' },
      'https://shop.ng/pages.xml': { type: 'application/xml', body: '<urlset><url><loc>https://shop.ng/faq</loc></url></urlset>' },
      'https://shop.ng/': { body: body(long('Home')) },
      'https://shop.ng/faq': { body: body(long('Do you deliver on Sundays? Yes')) },
    })

    const result = await new SiteCrawler(site).crawl({ startUrl: 'https://shop.ng/', allowedHosts: hosts, maxPages: 10, delayMs: 0 })

    expect(result.pages.map((p) => p.url)).toContain('https://shop.ng/faq')
  })

  it('stops at maxPages and reports empty JavaScript-only pages', async () => {
    const links = Array.from({ length: 20 }, (_, i) => `/p${i}`)
    const pages: Record<string, { body: string }> = {
      'https://shop.ng/': { body: body(long('Home'), links) },
      'https://shop.ng/p0': { body: '<html><body><div id="root"></div></body></html>' },
    }
    for (let i = 1; i < 20; i++) pages[`https://shop.ng/p${i}`] = { body: body(long(`Page ${i}`)) }
    const site = new FakeSite(pages)

    const result = await new SiteCrawler(site).crawl({ startUrl: 'https://shop.ng/', allowedHosts: hosts, maxPages: 5, delayMs: 0 })

    expect(result.pages).toHaveLength(5)
    expect(result.failures).toEqual(expect.arrayContaining([expect.objectContaining({ url: 'https://shop.ng/p0' })]))
  })
})
