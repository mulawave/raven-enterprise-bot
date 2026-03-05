import { Logger } from '@nestjs/common'
import { Queue, Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { MessageSender } from '../../../apps/api/messaging/message.sender'
import Redis from 'ioredis'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'

export interface OutboundMessageJob {
  conversationId: string
  tenantId: string
  customerId: string
  content: string
  platform: 'whatsapp' | 'instagram' | 'facebook'
  to: string // phone number or platform-specific ID
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
      this.logger.error(`Job ${job?.id} failed: ${err.message}`)
    })
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

  private async processJob(job: Job<OutboundMessageJob>): Promise<void> {
    const { conversationId, tenantId, customerId, content, platform, to } = job.data

    this.logger.log(`Sending message to ${to} on ${platform}`)

    // Get access token and phone number ID — read from DB config first, fall back to env
    const accessToken = (this.configLoader
      ? await this.configLoader.get('META_ACCESS_TOKEN')
      : process.env.META_ACCESS_TOKEN) || ''
    const phoneNumberId = (this.configLoader
      ? await this.configLoader.get('META_PHONE_NUMBER_ID')
      : process.env.META_PHONE_NUMBER_ID) || ''

    if (!accessToken || !phoneNumberId) {
      this.logger.warn('META_ACCESS_TOKEN or META_PHONE_NUMBER_ID not configured — skipping send')
      return
    }

    // Send message via platform API
    if (platform === 'whatsapp') {
      const sender = new MessageSender(accessToken, phoneNumberId)
      await sender.sendMessage(to, content)
    } else {
      this.logger.warn(`Platform ${platform} not yet implemented — skipping send`)
      return
    }

    // Persist outbound message to database
    await this.prisma.message.create({
      data: {
        tenant_id: tenantId,
        conversation_id: conversationId,
        sender_type: 'bot',
        content,
        created_at: new Date(),
      },
    })

    this.logger.log(`Message sent and persisted for conversation ${conversationId}`)
  }

  async close(): Promise<void> {
    await this.worker.close()
    await this.queue.close()
  }
}
