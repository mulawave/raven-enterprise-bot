import { extractPage } from './html-extract'
import { chunkText } from './chunker'
import { parseRobots } from './robots'
import { isPublicAddress } from './page-fetcher'
import { buildSearchQuery } from './knowledge-retriever'
import { normalizeUrl } from './site-crawler'

describe('extractPage', () => {
  const html = `<!doctype html><html><head><title>Delivery | Mama Put</title>
    <meta name="description" content="Fresh meals delivered across Lagos."></head>
    <body>
      <header><nav><a href="/menu">Menu</a><a href="/about#team">About</a></nav></header>
      <main>
        <h1>Delivery areas</h1>
        <p>We deliver to Lekki, Ikoyi and Victoria Island.</p>
        <p>Delivery costs ₦1,500 within 5km.</p>
        <script>trackEverything()</script>
        <a href="https://other.com/x">Partner</a>
        <a href="mailto:hi@mamaput.ng">Email</a>
      </main>
      <footer>© 2026 Mama Put · Cookie settings</footer>
    </body></html>`

  it('keeps main content, drops chrome and scripts, collects links', () => {
    const page = extractPage(html, 'https://mamaput.ng/delivery')
    expect(page.title).toBe('Delivery | Mama Put')
    expect(page.text).toContain('We deliver to Lekki, Ikoyi and Victoria Island.')
    expect(page.text).toContain('Delivery costs ₦1,500 within 5km.')
    expect(page.text).toContain('Fresh meals delivered across Lagos.')
    expect(page.text).not.toContain('trackEverything')
    expect(page.text).not.toContain('Cookie settings')
    expect(page.links).toEqual(expect.arrayContaining(['https://mamaput.ng/menu', 'https://mamaput.ng/about', 'https://other.com/x']))
    expect(page.links.some((l) => l.startsWith('mailto:'))).toBe(false)
  })

  it('keeps paragraphs on separate lines', () => {
    const page = extractPage('<body><p>One.</p><p>Two.</p></body>', 'https://a.ng/')
    expect(page.text).toBe('One.\nTwo.')
  })
})

describe('chunkText', () => {
  it('returns one chunk for short text, prefixed with the title', () => {
    const chunks = chunkText('Short page.', { title: 'Pricing' })
    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).toBe('Pricing\nShort page.')
  })

  it('splits long text into bounded, overlapping chunks', () => {
    const paragraphs = Array.from({ length: 40 }, (_, i) => `Paragraph ${i} ` + 'lorem ipsum dolor sit amet. '.repeat(8))
    const chunks = chunkText(paragraphs.join('\n'), { maxTokens: 200, overlapTokens: 20 })
    expect(chunks.length).toBeGreaterThan(5)
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(200 * 4 + 20 * 4 + 50)
    expect(chunks[1].text).toContain('lorem')
    expect(chunks.map((c) => c.text).join(' ')).toContain('Paragraph 39')
  })

  it('hard-wraps a single enormous sentence', () => {
    const chunks = chunkText('x'.repeat(5000), { maxTokens: 100, overlapTokens: 0 })
    expect(chunks.length).toBeGreaterThanOrEqual(12)
  })
})

describe('parseRobots', () => {
  const robots = parseRobots(`
User-agent: Googlebot
Disallow: /

User-agent: *
Disallow: /admin
Disallow: /*.json$
Allow: /admin/public

Sitemap: https://shop.ng/sitemap_index.xml
`)

  it('applies the * group when RavenBot has none', () => {
    expect(robots.isAllowed('/')).toBe(true)
    expect(robots.isAllowed('/admin/users')).toBe(false)
    expect(robots.isAllowed('/admin/public/faq')).toBe(true)
    expect(robots.isAllowed('/data.json')).toBe(false)
    expect(robots.isAllowed('/data.json?x=1')).toBe(true)
  })

  it('collects sitemaps', () => {
    expect(robots.sitemaps).toEqual(['https://shop.ng/sitemap_index.xml'])
  })

  it('prefers a RavenBot-specific group', () => {
    const r = parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: RavenBot\nDisallow: /private')
    expect(r.isAllowed('/about')).toBe(true)
    expect(r.isAllowed('/private/x')).toBe(false)
  })
})

describe('isPublicAddress', () => {
  it.each([
    ['127.0.0.1', false], ['10.1.2.3', false], ['172.20.0.1', false], ['192.168.1.1', false],
    ['169.254.169.254', false], ['100.64.0.1', false], ['0.0.0.0', false], ['::1', false],
    ['fd00::1', false], ['::ffff:127.0.0.1', false],
    ['102.89.33.10', true], ['8.8.8.8', true], ['2606:4700::1111', true],
  ])('%s → %s', (ip, expected) => {
    expect(isPublicAddress(ip)).toBe(expected)
  })
})

describe('buildSearchQuery', () => {
  it('ORs meaningful words and drops filler', () => {
    const terms = buildSearchQuery('Do you sell jollof in Lekki?')!.split(' or ')
    expect(terms).toEqual(['sell', 'jollof', 'lekki'])
  })

  it('treats "how much" as a price question and expands shopping synonyms', () => {
    const terms = buildSearchQuery('Hi, how much is delivery to Lekki?')!.split(' or ')
    expect(terms).toEqual(expect.arrayContaining(['delivery', 'shipping', 'lekki', 'price', 'cost', 'fee']))
    expect(terms).not.toContain('much')
    expect(terms).not.toContain('hi')
  })

  it('returns null when nothing searchable remains', () => {
    expect(buildSearchQuery('hi pls')).toBeNull()
  })

  it('strips characters that could alter query syntax', () => {
    const q = buildSearchQuery('price" -"free" (or) ')!
    expect(q).not.toMatch(/["()\-]/)
    expect(q.split(' or ')).toEqual(expect.arrayContaining(['price', 'free']))
  })
})

describe('normalizeUrl', () => {
  it('removes fragments, trailing slashes and tracking params', () => {
    expect(normalizeUrl('https://Shop.ng/menu/?utm_source=ig&b=2&a=1#top')).toBe('https://shop.ng/menu?a=1&b=2')
    expect(normalizeUrl('https://shop.ng/')).toBe('https://shop.ng/')
  })
})
