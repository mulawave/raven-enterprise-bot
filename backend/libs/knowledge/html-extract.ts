import { load } from 'cheerio'

export interface ExtractedPage {
  title: string | null
  text: string
  /** Absolute same-document links found on the page (fragment stripped) */
  links: string[]
}

/** Elements that never carry answerable page content */
const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'template', 'svg', 'canvas', 'iframe',
  'nav', 'header', 'footer', 'aside', 'form',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '[aria-hidden="true"]', '.cookie', '#cookie', '.cookies', '.cookie-banner',
].join(',')

const BLOCK_TAGS = new Set(['p', 'div', 'section', 'article', 'li', 'tr', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dd', 'dt', 'blockquote', 'pre', 'td', 'th'])

/**
 * Pull the readable main content out of an HTML page.
 * Prefers <main>/<article>, falls back to <body> with chrome removed.
 */
export function extractPage(html: string, pageUrl: string): ExtractedPage {
  const $ = load(html)

  const links = new Set<string>()
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return
    try {
      const abs = new URL(href, pageUrl)
      abs.hash = ''
      if (abs.protocol === 'http:' || abs.protocol === 'https:') links.add(abs.toString())
    } catch {
      /* ignore malformed hrefs */
    }
  })

  const title = ($('meta[property="og:title"]').attr('content') || $('title').first().text() || $('h1').first().text() || '').trim() || null
  const description = ($('meta[name="description"]').attr('content') || '').trim()

  $(NOISE_SELECTORS).remove()
  const root = $('main').first().length ? $('main').first()
    : $('article').first().length ? $('article').first()
    : $('[role="main"]').first().length ? $('[role="main"]').first()
    : $('body')

  // Insert line breaks at block boundaries so paragraphs don't run together
  root.find('*').each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase()
    if (tag && BLOCK_TAGS.has(tag)) $(el).append('\n')
  })

  const bodyText = normalizeWhitespace(root.text())
  const text = description && !bodyText.includes(description) ? `${description}\n${bodyText}` : bodyText

  return { title, text, links: [...links] }
}

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}
