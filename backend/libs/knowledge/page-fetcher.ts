import axios from 'axios'
import { lookup } from 'dns/promises'
import { isIP } from 'net'
import { CRAWLER_USER_AGENT } from './robots'

export const MAX_PAGE_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 5

export interface FetchedPage {
  url: string          // final URL after redirects
  status: number
  contentType: string
  body: string
}

export interface PageFetcher {
  /** Fetch a URL whose host (and every redirect hop) is in allowedHosts. Returns null on network failure. */
  fetch(url: string, allowedHosts: Set<string>): Promise<FetchedPage | null>
}

/**
 * Reject loopback, private, link-local, CGNAT and metadata ranges so a tenant
 * can't point a verified hostname at infrastructure on the shared server.
 */
export function isPublicAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return false
    if (a === 169 && b === 254) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 100 && b >= 64 && b <= 127) return false
    if (a >= 224) return false
    return true
  }
  const v6 = ip.toLowerCase()
  if (v6 === '::1' || v6 === '::') return false
  if (v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')) return false
  if (v6.startsWith('::ffff:')) return isPublicAddress(v6.slice(7))
  return true
}

export class HttpPageFetcher implements PageFetcher {
  async fetch(url: string, allowedHosts: Set<string>): Promise<FetchedPage | null> {
    let current = url
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const parsed = new URL(current)
      if (!(await this.isSafeTarget(parsed, allowedHosts))) return null

      let res
      try {
        res = await axios.get<string>(current, {
          timeout: 15000,
          maxRedirects: 0,
          maxContentLength: MAX_PAGE_BYTES,
          responseType: 'text',
          transformResponse: (d) => d,
          validateStatus: () => true,
          headers: { 'User-Agent': CRAWLER_USER_AGENT, Accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9' },
        })
      } catch {
        return null
      }

      if (res.status >= 300 && res.status < 400 && res.headers.location) {
        current = new URL(String(res.headers.location), current).toString()
        continue
      }
      return {
        url: current,
        status: res.status,
        contentType: String(res.headers['content-type'] ?? ''),
        body: typeof res.data === 'string' ? res.data : '',
      }
    }
    return null
  }

  private async isSafeTarget(url: URL, allowedHosts: Set<string>): Promise<boolean> {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    if (url.port && url.port !== '80' && url.port !== '443') return false
    if (!allowedHosts.has(url.hostname.toLowerCase())) return false
    try {
      const addrs = await lookup(url.hostname, { all: true })
      return addrs.length > 0 && addrs.every((a) => isPublicAddress(a.address))
    } catch {
      return false
    }
  }
}
