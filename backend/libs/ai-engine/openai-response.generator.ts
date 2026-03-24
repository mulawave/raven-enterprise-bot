import { Logger } from '@nestjs/common'
import OpenAI from 'openai'
import { ConfigLoaderService } from '../config/config-loader.service'

export interface ChatContext {
  businessName: string
  userMessage: string
  intent: string
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
  /** FAQs from the tenant's knowledge base */
  faqs?: { question: string; answer: string }[]
  /** Available catalogue items with prices already converted to naira */
  catalogueItems?: { category: string; name: string; description?: string | null; priceNaira: number; available: boolean }[]
  /** Override the entire system prompt base (still appends FAQ + catalogue blocks) */
  systemPromptOverride?: string
  /** Custom escalation message from TenantBotConfig */
  escalationMessage?: string
  /** Per-tenant OpenAI API key — overrides the global key if provided. */
  apiKey?: string
}

/**
 * OpenAI-powered response generator.
 * Falls back gracefully to null if the API key is not configured —
 * the caller should fall back to the rule-based response in that case.
 */
export class OpenAIResponseGenerator {
  private readonly logger = new Logger('OpenAIResponseGenerator')
  private globalClient: OpenAI | null = null

  constructor(private readonly configLoader: ConfigLoaderService) {}

  /**
   * Lazy-init the global OpenAI client (reads API key from DB config or env).
   * Per-tenant keys bypass this cache.
   */
  private async getClient(apiKeyOverride?: string): Promise<OpenAI | null> {
    if (apiKeyOverride) {
      return new OpenAI({ apiKey: apiKeyOverride })
    }

    if (this.globalClient) return this.globalClient

    const apiKey = (await this.configLoader.get('OPENAI_API_KEY')) ?? process.env.OPENAI_API_KEY
    if (!apiKey) return null

    this.globalClient = new OpenAI({ apiKey })
    return this.globalClient
  }

  /**
   * Generate a response using GPT.
   * Returns null if the API key is not set — caller uses rule-based fallback.
   */
  async generate(ctx: ChatContext): Promise<string | null> {
    const client = await this.getClient(ctx.apiKey)
    if (!client) return null

    try {
      // Build FAQ knowledge block
      let faqBlock = ''
      if (ctx.faqs && ctx.faqs.length > 0) {
        faqBlock =
          '\n\n## FAQ KNOWLEDGE BASE (use these to answer questions directly — never say you will check)\n' +
          ctx.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
      }

      // Build catalogue block
      let catalogueBlock = ''
      if (ctx.catalogueItems && ctx.catalogueItems.length > 0) {
        const available = ctx.catalogueItems.filter((i) => i.available)
        if (available.length > 0) {
          catalogueBlock =
            '\n\n## PRODUCT / SERVICE CATALOGUE (quote these prices directly — never say you are unsure of pricing)\n' +
            available
              .map((i) => {
                const desc = i.description ? ` — ${i.description}` : ''
                return `• ${i.category} › ${i.name}${desc}: ₦${i.priceNaira.toLocaleString()}`
              })
              .join('\n')
        }
      }

      const basePrompt = ctx.systemPromptOverride
        ? ctx.systemPromptOverride
        : `You are the AI sales and support assistant for ${ctx.businessName}, operating via WhatsApp.

Your PRIMARY goal is CONVERSION — turn every enquiry into a sale, booking, or clear next step toward one. Never end a reply without a call to action.

## RULES — ABSOLUTE
1. NEVER say "let me verify", "I'll check", "I'll get back to you", or any deferral phrase. Answer NOW.
2. NEVER say you don't know a price — if it's in the catalogue below, state it directly.
3. NEVER say you don't know the answer to a question — if it's in the FAQ below, answer it directly.
4. Keep replies SHORT and WhatsApp-friendly (2–4 sentences max).
5. Always end with an action: "Shall I place that order?", "Want to book now?", "Which would you like?", etc.
6. If a human agent is requested, say: "${ctx.escalationMessage ?? "I'll have a team member reach you shortly."}" then stop.
7. You can discuss and quote products/services from the catalogue freely.
8. NEVER confirm, place, or cancel an order/booking autonomously — guide customer to confirm with staff.
9. Detected intent: ${ctx.intent}`

      const systemPrompt = basePrompt + faqBlock + catalogueBlock

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...ctx.conversationHistory.slice(-8).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: ctx.userMessage },
      ]

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 300,
        temperature: 0.65,
      })

      return completion.choices[0]?.message?.content?.trim() ?? null
    } catch (err: any) {
      this.logger.error(`OpenAI API error: ${err.message}`)
      return null // Fall back to rule-based
    }
  }
}

