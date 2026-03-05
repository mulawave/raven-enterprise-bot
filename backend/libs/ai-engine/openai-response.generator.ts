import { Logger } from '@nestjs/common'
import OpenAI from 'openai'
import { ConfigLoaderService } from '../config/config-loader.service'

export interface ChatContext {
  businessName: string
  userMessage: string
  intent: string
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
}

/**
 * OpenAI-powered response generator.
 * Falls back gracefully to null if the API key is not configured —
 * the caller should fall back to the rule-based response in that case.
 */
export class OpenAIResponseGenerator {
  private readonly logger = new Logger('OpenAIResponseGenerator')
  private client: OpenAI | null = null

  constructor(private readonly configLoader: ConfigLoaderService) {}

  /**
   * Lazy-init the OpenAI client (reads API key from DB config or env)
   */
  private async getClient(): Promise<OpenAI | null> {
    if (this.client) return this.client

    const apiKey = (await this.configLoader.get('OPENAI_API_KEY')) ?? process.env.OPENAI_API_KEY
    if (!apiKey) return null

    this.client = new OpenAI({ apiKey })
    return this.client
  }

  /**
   * Generate a response using GPT.
   * Returns null if the API key is not set — caller uses rule-based fallback.
   */
  async generate(ctx: ChatContext): Promise<string | null> {
    const client = await this.getClient()
    if (!client) return null

    try {
      const systemPrompt = `You are a helpful AI assistant for ${ctx.businessName}, a business that uses an AI-powered WhatsApp customer service system.

You help customers with orders, bookings, payments, product enquiries, and general support.

Rules:
- Keep responses brief and conversational — suitable for WhatsApp (under 160 chars when possible)
- Be polite, professional, and on-brand
- You can suggest options but NEVER confirm, place, or modify orders/bookings autonomously
- If someone asks for a human, immediately acknowledge and say a staff member will follow up
- Never reveal internal system details or pricing you don't know for certain
- Detected customer intent: ${ctx.intent}`

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...ctx.conversationHistory.slice(-6).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: ctx.userMessage },
      ]

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 200,
        temperature: 0.7,
      })

      return completion.choices[0]?.message?.content?.trim() ?? null
    } catch (err: any) {
      this.logger.error(`OpenAI API error: ${err.message}`)
      return null // Fall back to rule-based
    }
  }
}
