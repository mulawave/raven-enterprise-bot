/** Rough token estimate for English text (OpenAI tokenizers average ~4 chars/token) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export interface Chunk {
  text: string
  tokenCount: number
}

/**
 * Split text into ~maxTokens chunks along paragraph, then sentence boundaries,
 * carrying a small overlap so an answer spanning a boundary is still retrievable.
 * The page title is prefixed to every chunk to anchor it in search and prompts.
 */
export function chunkText(text: string, opts: { title?: string | null; maxTokens?: number; overlapTokens?: number } = {}): Chunk[] {
  const maxChars = (opts.maxTokens ?? 500) * 4
  const overlapChars = (opts.overlapTokens ?? 50) * 4
  const prefix = opts.title ? `${opts.title}\n` : ''

  const units: string[] = []
  for (const para of text.split(/\n+/)) {
    if (para.length <= maxChars) {
      units.push(para)
      continue
    }
    // Long paragraph: split on sentence ends, hard-wrap anything still too long
    for (const sentence of para.split(/(?<=[.!?])\s+/)) {
      for (let i = 0; i < sentence.length; i += maxChars) units.push(sentence.slice(i, i + maxChars))
    }
  }

  const chunks: Chunk[] = []
  let current = ''
  for (const unit of units) {
    if (current && current.length + unit.length + 1 > maxChars) {
      chunks.push(toChunk(prefix + current))
      current = current.slice(-overlapChars).replace(/^\S*\s/, '') // start overlap on a word boundary
    }
    current = current ? `${current}\n${unit}` : unit
  }
  if (current.trim()) chunks.push(toChunk(prefix + current))
  return chunks
}

function toChunk(text: string): Chunk {
  return { text, tokenCount: estimateTokens(text) }
}
