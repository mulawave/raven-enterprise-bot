import { Injectable, OnModuleInit, OnApplicationShutdown, Logger } from '@nestjs/common'
import { Queue, Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { AiService, ProcessInput, ProcessOutput } from '../../../libs/ai-engine/ai.service'
import { IntentRouter } from '../../../libs/ai-engine/intent.router'
import { StateMachine } from '../../../libs/ai-engine/state.machine'
import { RedisSessionStore, RedisClient } from '../../../libs/ai-engine/session.store'
import { FallbackHandler } from '../../../libs/ai-engine/ai.service'
import { AuditLogger } from '../../../libs/monitoring/audit.logger'
import { SubscriptionsService } from '../../../libs/billing/subscriptions.service'
import { BrandingService } from '../../../libs/tenant/branding/branding.service'
import Redis from 'ioredis'

export interface AiMessageJob {
  conversationId: string
  messageId: string
  tenantId: string
  customerId: string
  content: string
}

// Adapter to make ioredis compatible with RedisClient interface
class RedisAdapter implements RedisClient {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key)
  }

  async set(key: string, value: string, mode?: string, durationSeconds?: number): Promise<unknown> {
    if (mode === 'EX' && durationSeconds) {
      return this.redis.set(key, value, 'EX', durationSeconds)
    }
    return this.redis.set(key, value)
  }
}

@Injectable()
export class AiMessageProcessor implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(AiMessageProcessor.name)
  private queue!: Queue<AiMessageJob>
  private worker!: Worker<AiMessageJob, ProcessOutput>
  private aiService!: AiService
  private readonly subscriptionsService: SubscriptionsService
  private readonly brandingService: BrandingService

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redisConnection: Redis,
  ) {
    this.subscriptionsService = new SubscriptionsService(this.prisma)
    this.brandingService = new BrandingService(this.prisma)
  }

  onModuleInit(): void {
    // Initialize queue
    this.queue = new Queue<AiMessageJob>('ai-messages', {
      connection: this.redisConnection,
    })

    // Initialize AI service with dependencies
    const redisAdapter = new RedisAdapter(this.redisConnection)
    const sessionStore = new RedisSessionStore(redisAdapter)
    const router = new IntentRouter()
    const stateMachine = new StateMachine()
    const fallback = new FallbackHandler()
    const auditLogger = new AuditLogger(this.prisma)

    this.aiService = new AiService(router, stateMachine, sessionStore, fallback, auditLogger)

    // Initialize worker with retry logic
    this.worker = new Worker<AiMessageJob, ProcessOutput>(
      'ai-messages',
      async (job: Job<AiMessageJob>) => this.processJob(job),
      {
        connection: this.redisConnection,
        concurrency: 5,
        limiter: {
          max: 100,
          duration: 60000, // 100 jobs per minute
        },
      },
    )

    // Event handlers
    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed for conversation ${job.data.conversationId}`)
    })

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`)
    })
  }

  async onApplicationShutdown(): Promise<void> {
    await this.close()
  }

  async enqueue(data: AiMessageJob): Promise<void> {
    await this.queue.add('process-message', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 500, // Keep last 500 failed jobs
    })
  }

  private async processJob(job: Job<AiMessageJob>): Promise<ProcessOutput> {
    const { conversationId, messageId, tenantId, customerId, content } = job.data

    this.logger.log(`Processing message ${messageId} in conversation ${conversationId}`)

    // Fetch tenant branding for personalized AI responses
    const branding = await this.brandingService.getBranding(tenantId)

    // Call AI service
    const input: ProcessInput = {
      sessionId: conversationId,
      text: content,
      tenantId,
      userId: customerId,
      brandingName: branding.name, // Inject business name for AI
    }

    const output = await this.aiService.processMessage(input)

    // Increment conversation counter for billing
    try {
      await this.subscriptionsService.incrementConversationCount(tenantId)
      this.logger.log(`Incremented conversation count for tenant ${tenantId}`)
    } catch (error) {
      this.logger.error(`Failed to increment conversation count: ${(error as Error).message}`)
      // Don't fail the job if billing tracking fails
    }

    // 
    // For now, just log the AI response
    // In a real system, this would enqueue an outbound message job
    this.logger.log(`AI response: "${output.text}" (intent: ${output.intent}, state: ${output.state})`)

    // TODO PHASE 5: Enqueue outbound message
    // await this.outboundQueue.enqueue({
    //   conversationId,
    //   tenantId,
    //   customerId,
    //   content: output.text,
    // })

    return output
  }

  async close(): Promise<void> {
    await this.worker.close()
    await this.queue.close()
  }
}
