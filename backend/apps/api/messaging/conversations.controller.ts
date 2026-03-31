import {
  Controller, Get, Post, Patch, Body, Param, UseGuards,
  NotFoundException, Inject, Optional, UseInterceptors, UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import * as path from 'path'
import * as fs from 'fs'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'
import { MessageSender } from './message.sender'
import { NotificationService } from '../../../libs/notifications/notification.service'
import { OpenAIResponseGenerator } from '../../../libs/ai-engine/openai-response.generator'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'

const OVERRIDE_KEY = (convId: string) => `conv_override:${convId}`
const TAKEOVER_STATE_KEY = (convId: string) => `conv_takeover_state:${convId}`

@Controller('api/messaging')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    private readonly prisma: PrismaClient,
    @Optional() @Inject(Redis) private readonly redis?: Redis,
    @Optional() private readonly notificationService?: NotificationService,
    @Optional() private readonly openaiGenerator?: OpenAIResponseGenerator,
    @Optional() private readonly configLoader?: ConfigLoaderService,
  ) {}

  /**
   * Reads Meta WhatsApp credentials from the tenant's theme JSON,
   * falling back to environment variables.
   */
  private async getTenantMeta(tenantId: string): Promise<{ accessToken: string; phoneNumberId: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { theme: true },
    })
    let accessToken = process.env.META_ACCESS_TOKEN ?? ''
    let phoneNumberId = process.env.META_PHONE_NUMBER_ID ?? ''
    if (tenant?.theme) {
      try {
        const theme = JSON.parse(tenant.theme) as Record<string, unknown>
        if (typeof theme.META_ACCESS_TOKEN === 'string' && theme.META_ACCESS_TOKEN)
          accessToken = theme.META_ACCESS_TOKEN
        if (typeof theme.META_PHONE_NUMBER_ID === 'string' && theme.META_PHONE_NUMBER_ID)
          phoneNumberId = theme.META_PHONE_NUMBER_ID
      } catch { /* ignore malformed JSON */ }
    }
    return { accessToken, phoneNumberId }
  }

  /**
   * GET /api/messaging/conversations
   * Returns recent conversations, including botOverride status from Redis.
   */
  @Get('conversations')
  async getConversations(@CurrentUser() user: any) {
    const tenantId: string = user.tenant_id

    const conversations = await this.prisma.conversation.findMany({
      where: { tenant_id: tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { content: true, sender_type: true, created_at: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updated_at: 'desc' },
      take: 100,
    })

    // Fetch botOverride status for all conversations in a single Redis MGET
    let overrideValues: (string | null)[] = []
    if (this.redis && conversations.length > 0) {
      const keys = conversations.map((c) => OVERRIDE_KEY(c.id))
      overrideValues = await this.redis.mget(...keys)
    }

    return conversations.map((c, i) => ({
      id: c.id,
      customerId: c.customer_id,
      customerName: c.customer.name ?? c.customer.phone ?? `Customer ${c.customer_id.slice(0, 8)}`,
      customerPhone: c.customer.phone ?? null,
      messagesCount: c._count.messages,
      lastMessageAt: (c.messages[0]?.created_at ?? c.updated_at).toISOString(),
      lastMessage: c.messages[0]?.content ?? '',
      lastMessageBy: c.messages[0]?.sender_type ?? '',
      status: c.status,
      botOverride: overrideValues[i] === '1',
    }))
  }

  /**
   * GET /api/messaging/conversations/:id/messages
   * Returns all messages in a specific conversation (chronological order).
   */
  @Get('conversations/:id/messages')
  async getMessages(@CurrentUser() user: any, @Param('id') id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenant_id: user.tenant_id },
    })
    if (!conversation) throw new NotFoundException('Conversation not found')

    const messages = await this.prisma.message.findMany({
      where: { conversation_id: id },
      orderBy: { created_at: 'asc' },
      take: 200,
    })

    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      senderType: m.sender_type,
      senderId: m.sender_id ?? null,
      createdAt: m.created_at.toISOString(),
    }))
  }

  /**
   * PATCH /api/messaging/conversations/:id
   * Update conversation status: open | resolved | archived
   */
  @Patch('conversations/:id')
  async updateConversation(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { status?: string },
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenant_id: user.tenant_id },
    })
    if (!conversation) throw new NotFoundException('Conversation not found')

    const allowed = ['open', 'resolved', 'archived']
    const newStatus = body.status && allowed.includes(body.status) ? body.status : conversation.status

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { status: newStatus },
    })

    return { id: updated.id, status: updated.status }
  }

  /**
   * PATCH /api/messaging/conversations/:id/override
   * Enable or disable bot override for a conversation.
   * When enabled, the AI will skip this conversation until overridden back.
   */
  @Patch('conversations/:id/override')
  async setBotOverride(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { override: boolean },
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenant_id: user.tenant_id },
    })
    if (!conversation) throw new NotFoundException('Conversation not found')

    if (this.redis) {
      const key = OVERRIDE_KEY(id)
      const stateKey = `conv_takeover_state:${id}`
      if (body.override) {
        await this.redis.set(key, '1') // no TTL — indefinite until tenant re-enables bot
        // Initialize progressive takeover prompt state
        const state = {
          attempt: 0,
          nextPromptAt: Date.now() + 600_000, // first prompt after 10 minutes
          baseInterval: 600_000, // 10 minutes in ms
          tenantId: user.tenant_id,
        }
        await this.redis.set(stateKey, JSON.stringify(state))
      } else {
        await this.redis.del(key)
        await this.redis.del(stateKey)
      }
    }

    return { botOverride: body.override }
  }

  /**
   * POST /api/messaging/conversations/:id/send
   * Send a manual text message to the customer as a human agent.
   * Keeps the bot override alive (removes any pending TTL).
   */
  @Post('conversations/:id/send')
  async sendManualMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    if (!body.message?.trim()) throw new NotFoundException('Message is required')

    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenant_id: user.tenant_id },
      include: { customer: { select: { phone: true } } },
    })
    if (!conversation) throw new NotFoundException('Conversation not found')

    const customerPhone = (conversation as any).customer?.phone
    if (!customerPhone) throw new NotFoundException('No phone number for this customer')

    const { accessToken, phoneNumberId } = await this.getTenantMeta(user.tenant_id)
    if (!accessToken || !phoneNumberId) {
      throw new Error('WhatsApp credentials not configured — save your keys in Settings → WhatsApp & AI')
    }

    const sender = new MessageSender(accessToken, phoneNumberId)
    await sender.sendMessage(customerPhone, body.message.trim())

    const msg = await this.prisma.message.create({
      data: {
        tenant_id: user.tenant_id,
        conversation_id: id,
        sender_type: 'human',
        content: body.message.trim(),
        created_at: new Date(),
      },
    })
    await this.prisma.conversation.update({ where: { id }, data: { updated_at: new Date() } })

    // Human replied — set (or keep) override so the bot does not also fire a response
    if (this.redis) {
      await this.redis.set(OVERRIDE_KEY(id), '1') // no TTL — stays until agent explicitly re-enables bot

      // Reset the takeover prompt timer — tenant activity pushes the next prompt forward
      const stateKey = `conv_takeover_state:${id}`
      const stateRaw = await this.redis.get(stateKey)
      if (stateRaw) {
        try {
          const state = JSON.parse(stateRaw)
          const currentInterval = state.baseInterval * (state.attempt + 1)
          state.nextPromptAt = Date.now() + currentInterval
          await this.redis.set(stateKey, JSON.stringify(state))
        } catch { /* ignore malformed state */ }
      }
    }

    return {
      id: msg.id,
      content: msg.content,
      senderType: msg.sender_type,
      senderId: null,
      createdAt: msg.created_at.toISOString(),
    }
  }

  /**
   * POST /api/messaging/conversations/:id/send-media
   * Upload and send an image, audio, or video file to the customer.
   * File is stored locally and also sent via WhatsApp Graph API.
   * Content is stored as a JSON blob in the message content field.
   */
  @Post('conversations/:id/send-media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.join(process.cwd(), 'uploads', 'media')
          fs.mkdirSync(dir, { recursive: true })
          cb(null, dir)
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname)
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
        },
      }),
      limits: { fileSize: 16 * 1024 * 1024 }, // 16 MB max
    }),
  )
  async sendMediaMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { caption?: string },
  ) {
    if (!file) throw new NotFoundException('File is required')

    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenant_id: user.tenant_id },
      include: { customer: { select: { phone: true } } },
    })
    if (!conversation) throw new NotFoundException('Conversation not found')

    const customerPhone = (conversation as any).customer?.phone
    if (!customerPhone) throw new NotFoundException('No phone number for this customer')

    const { accessToken, phoneNumberId } = await this.getTenantMeta(user.tenant_id)
    if (!accessToken || !phoneNumberId) {
      throw new Error('WhatsApp credentials not configured — save your keys in Settings → WhatsApp & AI')
    }

    const sender = new MessageSender(accessToken, phoneNumberId)
    const mimeType = file.mimetype
    const mediaType = mimeType.startsWith('image/')
      ? 'image'
      : mimeType.startsWith('audio/')
      ? 'audio'
      : mimeType.startsWith('video/')
      ? 'video'
      : 'document'

    const mediaId = await sender.uploadMedia(file.path, mimeType)
    await sender.sendMediaMessage(customerPhone, mediaId, mediaType as 'image' | 'audio' | 'video' | 'document', body.caption)

    const mediaUrl = `${process.env.API_PUBLIC_URL || 'https://api.yourdomain.com'}/uploads/media/${file.filename}`
    const content = JSON.stringify({
      __media: true,
      type: mediaType,
      url: mediaUrl,
      filename: file.originalname,
      caption: body.caption ?? '',
    })

    const msg = await this.prisma.message.create({
      data: {
        tenant_id: user.tenant_id,
        conversation_id: id,
        sender_type: 'human',
        content,
        created_at: new Date(),
      },
    })
    await this.prisma.conversation.update({ where: { id }, data: { updated_at: new Date() } })

    // Keep override alive
    if (this.redis) {
      const key = OVERRIDE_KEY(id)
      const exists = await this.redis.exists(key)
      if (exists) await this.redis.persist(key)
    }

    return {
      id: msg.id,
      content: msg.content,
      senderType: msg.sender_type,
      senderId: null,
      createdAt: msg.created_at.toISOString(),
    }
  }

  /**
   * POST /api/messaging/conversations/:id/takeover-accept
   * Tenant accepts bot takeover — clears override, extracts hidden FAQ from the conversation.
   */
  @Post('conversations/:id/takeover-accept')
  async acceptTakeover(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenant_id: user.tenant_id },
    })
    if (!conversation) throw new NotFoundException('Conversation not found')

    if (this.redis) {
      await this.redis.del(OVERRIDE_KEY(id))
      await this.redis.del(TAKEOVER_STATE_KEY(id))
    }

    // Re-open conversation if it was escalated
    if (conversation.status === 'escalated') {
      await this.prisma.conversation.update({
        where: { id },
        data: { status: 'open' },
      })
    }

    // Extract hidden FAQ from the human↔customer exchange (fire-and-forget)
    this.extractHiddenFaq(id, user.tenant_id).catch((err) => {
      // Non-critical — don't block the response
    })

    return { ok: true, botOverride: false }
  }

  /**
   * POST /api/messaging/conversations/:id/takeover-decline
   * Tenant declines bot takeover — push next prompt further out.
   */
  @Post('conversations/:id/takeover-decline')
  async declineTakeover(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenant_id: user.tenant_id },
    })
    if (!conversation) throw new NotFoundException('Conversation not found')

    if (this.redis) {
      const stateKey = TAKEOVER_STATE_KEY(id)
      const stateRaw = await this.redis.get(stateKey)
      if (stateRaw) {
        try {
          const state = JSON.parse(stateRaw)
          state.attempt += 1
          state.nextPromptAt = Date.now() + state.baseInterval * (state.attempt + 1)
          await this.redis.set(stateKey, JSON.stringify(state))
        } catch { /* ignore */ }
      }
    }

    return { ok: true }
  }

  /**
   * Extract a hidden FAQ entry from human↔customer messages during the override period.
   * Uses OpenAI to summarize the exchange into a Q&A pair for bot self-learning.
   */
  private async extractHiddenFaq(conversationId: string, tenantId: string): Promise<void> {
    // Fetch the human↔customer messages (last 20 during override period)
    const messages = await this.prisma.message.findMany({
      where: {
        conversation_id: conversationId,
        sender_type: { in: ['human', 'customer'] },
      },
      orderBy: { created_at: 'desc' },
      take: 20,
      select: { sender_type: true, content: true },
    })

    if (messages.length < 2) return // Need at least one exchange

    // Build conversation transcript (chronological)
    const transcript = messages
      .reverse()
      .map((m) => `${m.sender_type === 'customer' ? 'Customer' : 'Agent'}: ${m.content}`)
      .join('\n')

    // Use OpenAI to summarize into a FAQ
    if (!this.openaiGenerator || !this.configLoader) return

    let apiKey: string | undefined
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { theme: true },
    })
    if (tenant?.theme) {
      try {
        const theme = JSON.parse(tenant.theme) as Record<string, unknown>
        if (typeof theme.OPENAI_API_KEY === 'string' && theme.OPENAI_API_KEY) {
          apiKey = theme.OPENAI_API_KEY
        }
      } catch { /* ignore */ }
    }
    if (!apiKey) {
      apiKey = (await this.configLoader.get('OPENAI_API_KEY').catch(() => null)) ?? process.env.OPENAI_API_KEY ?? undefined
    }
    if (!apiKey) return

    try {
      const { default: OpenAI } = await import('openai')
      const client = new OpenAI({ apiKey })
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a knowledge extraction tool. Summarize the following customer-agent conversation into a single FAQ entry. Extract the customer\'s core question or issue and the agent\'s resolution or answer. Return ONLY valid JSON: { "question": "...", "answer": "..." }. If the conversation is too vague or not useful as a FAQ, return { "skip": true }.',
          },
          { role: 'user', content: transcript },
        ],
        max_tokens: 300,
        temperature: 0.3,
      })

      const raw = completion.choices[0]?.message?.content?.trim()
      if (!raw) return

      const parsed = JSON.parse(raw)
      if (parsed.skip) return
      if (!parsed.question?.trim() || !parsed.answer?.trim()) return

      // Check for duplicate before inserting
      const existing = await this.prisma.tenantFaq.findFirst({
        where: {
          tenant_id: tenantId,
          question: parsed.question.trim(),
          hidden: true,
        },
      })
      if (existing) return

      await this.prisma.tenantFaq.create({
        data: {
          tenant_id: tenantId,
          question: parsed.question.trim(),
          answer: parsed.answer.trim(),
          hidden: true,
          source: 'learned',
          source_conversation_id: conversationId,
        },
      })
    } catch { /* Non-critical — FAQ extraction is best-effort */ }
  }

  /**
   * GET /api/messaging/debug
   * Diagnostic info: message/conversation counts, last activity, webhook URLs.
   */
  @Get('debug')
  async getDebugInfo(@CurrentUser() user: any) {
    const tenantId: string = user.tenant_id

    const [convCount, msgCount, lastMsg, openCount] = await Promise.all([
      this.prisma.conversation.count({ where: { tenant_id: tenantId } }),
      this.prisma.message.count({ where: { tenant_id: tenantId } }),
      this.prisma.message.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
        select: { created_at: true, sender_type: true, content: true },
      }),
      this.prisma.conversation.count({ where: { tenant_id: tenantId, status: 'open' } }),
    ])

    return {
      conversations: convCount,
      openConversations: openCount,
      messages: msgCount,
      lastMessageAt: lastMsg?.created_at?.toISOString() ?? null,
      lastMessageBy: lastMsg?.sender_type ?? null,
      lastMessagePreview: lastMsg?.content?.slice(0, 80) ?? null,
      webhookUrl: `${process.env.API_PUBLIC_URL || 'https://api.yourdomain.com'}/api/messaging/webhook/whatsapp`,
      webhookVerifyUrl: `${process.env.API_PUBLIC_URL || 'https://api.yourdomain.com'}/api/messaging/webhook/verify`,
    }
  }
}
