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

const OVERRIDE_KEY = (convId: string) => `conv_override:${convId}`

@Controller('api/messaging')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    private readonly prisma: PrismaClient,
    @Optional() @Inject(Redis) private readonly redis?: Redis,
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
      if (body.override) {
        await this.redis.set(key, '1') // no TTL — human has taken over indefinitely
      } else {
        await this.redis.del(key)
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

    const mediaUrl = `https://api.raven-ai.online/uploads/media/${file.filename}`
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
      webhookUrl: 'https://api.raven-ai.online/api/messaging/webhook/whatsapp',
      webhookVerifyUrl: 'https://api.raven-ai.online/api/messaging/webhook/verify',
    }
  }
}
