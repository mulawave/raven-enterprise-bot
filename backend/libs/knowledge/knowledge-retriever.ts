import { PrismaClient } from '@prisma/client'

export interface KnowledgePassage {
  chunkId: string
  title: string | null
  url: string | null
  text: string
  rank: number
}

interface RankedRow {
  id: string
  text: string
  title: string | null
  url: string
  rank: number
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'do', 'does', 'did', 'i', 'you', 'we', 'they', 'it', 'me', 'my', 'your',
  'our', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'with', 'what', 'how', 'can', 'please', 'hi', 'hello', 'abeg', 'pls', 'dey', 'na',
])

/** "how much" / "wetin be the price" style phrasing signals a price question */
const PRICE_PHRASES = /\bhow much\b|\bwetin be\b|\bhow far\b.*\bprice\b/i

/**
 * Everyday shopping vocabulary customers use interchangeably. Full-text search
 * matches word stems, not meaning, so "price" would otherwise miss "costs ₦1,500".
 */
const SYNONYM_GROUPS = [
  ['price', 'cost', 'costs', 'fee', 'fees', 'charge', 'charges', 'amount', 'rate', 'rates', 'pricing'],
  ['delivery', 'deliver', 'shipping', 'ship', 'dispatch', 'logistics'],
  ['location', 'address', 'located', 'branch', 'directions'],
  ['hours', 'open', 'opening', 'close', 'closing'],
  ['refund', 'return', 'returns', 'exchange'],
  ['pay', 'payment', 'transfer', 'card', 'pos'],
  ['book', 'booking', 'reservation', 'reserve', 'appointment'],
  ['contact', 'phone', 'call', 'whatsapp', 'email'],
]
const SYNONYMS = new Map<string, string[]>()
for (const group of SYNONYM_GROUPS) for (const word of group) SYNONYMS.set(word, group)

/**
 * Turn a free-form customer message into an OR query for websearch_to_tsquery.
 * OR (rather than the default AND) keeps recall high for conversational
 * questions; ts_rank_cd then favours chunks that match more of the terms.
 */
export function buildSearchQuery(message: string): string | null {
  const priceIntent = PRICE_PHRASES.test(message)
  const words = (priceIntent ? `${message} price` : message)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !(priceIntent && w === 'much'))
  const unique = [...new Set(words)].slice(0, 16)
  if (!unique.length) return null
  const expanded = new Set(unique)
  for (const w of unique) for (const syn of SYNONYMS.get(w) ?? []) expanded.add(syn)
  return [...expanded].join(' or ')
}

/**
 * Full-text retrieval over a tenant's indexed knowledge (Postgres tsvector).
 * Kept behind this interface so an embedding re-rank can be added later
 * without touching callers.
 */
export class KnowledgeRetriever {
  constructor(private readonly prisma: PrismaClient) {}

  async search(tenantId: string, message: string, opts: { limit?: number; maxChars?: number } = {}): Promise<KnowledgePassage[]> {
    const query = buildSearchQuery(message)
    if (!query) return []
    const limit = opts.limit ?? 6
    const maxChars = opts.maxChars ?? 10000

    let rows: RankedRow[]
    try {
      rows = await this.prisma.$queryRaw<RankedRow[]>`
        SELECT c.id, c.text, d.title, d.url, ts_rank_cd(c.search_tsv, q)::float8 AS rank
        FROM "KnowledgeChunk" c
        JOIN "KnowledgeDocument" d ON d.id = c.document_id
        JOIN "WebsiteKnowledgeSource" s ON s.id = d.source_id,
             websearch_to_tsquery('english', ${query}) q
        WHERE c.tenant_id = ${tenantId}
          AND d.status = 'indexed'
          AND s.is_enabled = true
          AND c.search_tsv @@ q
        ORDER BY rank DESC
        LIMIT ${limit * 3}
      `
    } catch {
      // Knowledge is an enhancement — never fail a customer reply because search failed
      return []
    }
    if (!rows.length) return []

    // Drop weak tail matches, cap chunks per page for diversity, and fit the prompt budget
    const floor = rows[0].rank * 0.2
    const perDoc = new Map<string, number>()
    const passages: KnowledgePassage[] = []
    let chars = 0
    for (const row of rows) {
      if (row.rank < floor) break
      const key = row.url
      if ((perDoc.get(key) ?? 0) >= 2) continue
      if (chars + row.text.length > maxChars) continue
      perDoc.set(key, (perDoc.get(key) ?? 0) + 1)
      chars += row.text.length
      passages.push({
        chunkId: row.id,
        title: row.title,
        url: row.url.startsWith('text://') ? null : row.url,
        text: row.text,
        rank: row.rank,
      })
      if (passages.length >= limit) break
    }
    return passages
  }
}
