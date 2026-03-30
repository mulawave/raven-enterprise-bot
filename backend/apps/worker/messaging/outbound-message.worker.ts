import { Logger } from '@nestjs/common'
import { Queue, Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { MessageSender } from '../../../apps/api/messaging/message.sender'
import Redis from 'ioredis'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'
import type { GeneratedPrismaClient } from '../../../types/prisma-generated'

export interface OutboundMessageJob {
  conversationId: string
  tenantId: string
  customerId: string
  content: string
  platform: 'whatsapp' | 'instagram' | 'facebook'
  to: string // phone number or platform-specific ID
  /** 'text' (default), 'image_link', 'interactive_list', or 'document' */
  messageType?: 'text' | 'image_link' | 'interactive_list' | 'document'
  /** Public image URL — used when messageType === 'image_link' */
  imageUrl?: string
  /** Payload for messageType === 'interactive_list' */
  interactiveList?: {
    header: string
    body: string
    footer: string
    button: string
    sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>
  }
  /** WhatsApp media_id for messageType === 'document' */
  mediaId?: string
  /** Filename shown to recipient for messageType === 'document' */
  filename?: string
}

export class OutboundMessageWorker {
  private readonly logger = new Logger('OutboundMessageWorker')
  private readonly queue: Queue<OutboundMessageJob>
  private readonly worker: Worker<OutboundMessageJob, void>

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redisConnection: Redis,
    private readonly configLoader?: ConfigLoaderService,
  ) {
    // Initialize queue
    this.queue = new Queue<OutboundMessageJob>('outbound-messages', {
      connection: this.redisConnection,
    })

    // Initialize worker with retry logic
    this.worker = new Worker<OutboundMessageJob, void>(
      'outbound-messages',
      async (job: Job<OutboundMessageJob>) => this.processJob(job),
      {
        connection: this.redisConnection,
        concurrency: 10,
        limiter: {
          max: 200,
          duration: 60000, // 200 messages per minute
        },
      },
    )

    // Event handlers
    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed — sent to ${job.data.to}`)
    })

    this.worker.on('failed', (job, err) => {
      const axiosBody = (err as any)?.response?.data
      const detail = axiosBody ? ` | WhatsApp: ${JSON.stringify(axiosBody)}` : ''
      this.logger.error(`Job ${job?.id} failed: ${err.message}${detail}`)
    })
  }

  private get db(): GeneratedPrismaClient {
    return this.prisma as unknown as GeneratedPrismaClient
  }

  async enqueue(data: OutboundMessageJob): Promise<void> {
    await this.queue.add('send-message', data, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: 100,
      removeOnFail: 1000,
    })
  }

  /**
   * Send a message directly in-process (fire-and-forget), bypassing the BullMQ
   * queue entirely. Used by AiMessageProcessor to avoid Redis allkeys-lru eviction
   * dropping outbound jobs before the worker can consume them.
   */
  scheduleOutbound(data: OutboundMessageJob): void {
    this.processJob({ data } as Job<OutboundMessageJob>).catch((err: Error) => {
      this.logger.error(`Direct outbound send failed to ${data.to}: ${err.message}`)
    })
  }

  private async processJob(job: Job<OutboundMessageJob>): Promise<void> {
    const { conversationId, tenantId, customerId, content, platform, to } = job.data

    this.logger.log(`Sending message to ${to} on ${platform}`)

    // Delivery gate
    if (process.env.LICENSING_ENABLED !== 'false') {
      const active = await this.db.instanceActivation.findFirst({ where: { status: 'ACTIVE' } }).catch(() => null)
      if (!active) {
        this.logger.warn(`Message delivery suspended for ${to}`)
        return
      }
    }

    // Prefer per-tenant keys from Tenant.theme, fall back to global DB config, then env vars
    let accessToken = ''
    let phoneNumberId = ''

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { theme: true },
    })
    if (tenant?.theme) {
      try {
        const theme = JSON.parse(tenant.theme) as Record<string, unknown>
        if (typeof theme.META_ACCESS_TOKEN === 'string' && theme.META_ACCESS_TOKEN) {
          accessToken = theme.META_ACCESS_TOKEN
        }
        if (typeof theme.META_PHONE_NUMBER_ID === 'string' && theme.META_PHONE_NUMBER_ID) {
          phoneNumberId = theme.META_PHONE_NUMBER_ID
        }
      } catch { /* ignore invalid JSON */ }
    }

    // Fall back to global config / env vars
    if (!accessToken) {
      accessToken = (this.configLoader
        ? await this.configLoader.get('META_ACCESS_TOKEN')
        : process.env.META_ACCESS_TOKEN) || ''
    }
    if (!phoneNumberId) {
      phoneNumberId = (this.configLoader
        ? await this.configLoader.get('META_PHONE_NUMBER_ID')
        : process.env.META_PHONE_NUMBER_ID) || ''
    }

    if (!accessToken || !phoneNumberId) {
      this.logger.warn('META_ACCESS_TOKEN or META_PHONE_NUMBER_ID not configured — skipping send')
      return
    }

    // Send message via platform API
    if (platform === 'whatsapp') {
      const sender = new MessageSender(accessToken, phoneNumberId)
      if (job.data.messageType === 'image_link' && job.data.imageUrl) {
        await sender.sendImageByLink(to, job.data.imageUrl, content || undefined)
      } else if (job.data.messageType === 'interactive_list' && job.data.interactiveList) {
        const { header, body, footer, button, sections } = job.data.interactiveList
        await sender.sendInteractiveList(to, header, body, footer, button, sections)
      } else if (job.data.messageType === 'document' && job.data.mediaId) {
        await sender.sendDocument(to, job.data.mediaId, job.data.filename ?? 'document.pdf')
      } else {
        await sender.sendMessage(to, content)
      }
    } else {
      this.logger.warn(`Platform ${platform} not yet implemented — skipping send`)
      return
    }

    // Determine the content to persist (interactive/document messages use a placeholder)
    const persistedContent =
      job.data.messageType === 'interactive_list'
        ? '[Sent service catalogue]'
        : job.data.messageType === 'document'
          ? `[Sent PDF: ${job.data.filename ?? 'document'}]`
          : content

    // Persist outbound message and bump conversation updated_at so it surfaces at top of inbox
    await this.prisma.message.create({
      data: {
        tenant_id: tenantId,
        conversation_id: conversationId,
        sender_type: 'bot',
        content: persistedContent,
        created_at: new Date(),
      },
    })
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updated_at: new Date() },
    })

    this.logger.log(`Message sent and persisted for conversation ${conversationId}`)
  }

  async close(): Promise<void> {
    await this.worker.close()
    await this.queue.close()
  }
}
