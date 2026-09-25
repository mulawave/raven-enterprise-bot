export const CRAWLER_USER_AGENT = 'RavenBot/1.0 (+https://raven-ai.online/bot)'
const AGENT_TOKEN = 'ravenbot'

export interface RobotsRules {
  isAllowed(path: string): boolean
  sitemaps: string[]
}

/**
 * Minimal robots.txt support: groups for `RavenBot` (preferred) or `*`,
 * Allow/Disallow with `*` wildcards and `$` anchors, longest match wins.
 */
export function parseRobots(content: string): RobotsRules {
  const groups: { agents: string[]; rules: { allow: boolean; pattern: string }[] }[] = []
  const sitemaps: string[] = []
  let current: (typeof groups)[number] | null = null
  let lastWasAgent = false

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()

    if (key === 'sitemap') {
      if (value) sitemaps.push(value)
      continue
    }
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (!current) continue
    if (key === 'allow' || key === 'disallow') {
      // Empty Disallow means allow everything
      if (value) current.rules.push({ allow: key === 'allow', pattern: value })
    }
  }

  const group = groups.find((g) => g.agents.some((a) => a.includes(AGENT_TOKEN)))
    ?? groups.find((g) => g.agents.includes('*'))
  const rules = group?.rules ?? []

  return {
    sitemaps,
    isAllowed(path: string) {
      let best: { allow: boolean; length: number } | null = null
      for (const rule of rules) {
        if (!matches(rule.pattern, path)) continue
        if (!best || rule.pattern.length > best.length || (rule.pattern.length === best.length && rule.allow)) {
          best = { allow: rule.allow, length: rule.pattern.length }
        }
      }
      return best ? best.allow : true
    },
  }
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$')
  const body = anchored ? pattern.slice(0, -1) : pattern
  const regex = new RegExp('^' + body.split('*').map(escapeRegex).join('.*') + (anchored ? '$' : ''))
  return regex.test(path)
}

function escapeRegex(s: string): string {
  return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
}

export const ALLOW_ALL: RobotsRules = { sitemaps: [], isAllowed: () => true }
