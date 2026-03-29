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
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'
import { OpenAIResponseGenerator } from '../../../libs/ai-engine/openai-response.generator'
import { PaymentService } from '../../../libs/payments/payment.service'
import { PaystackService } from '../../../libs/payments/paystack.service'
import { OutboundMessageWorker } from './outbound-message.worker'
import type { OutboundMessageJob } from './outbound-message.worker'
import { NotificationService } from '../../../libs/notifications/notification.service'
import Redis from 'ioredis'

interface CartItem {
  menuItemId: string
  name: string
  priceKobo: number
  category: string
}

interface CartData {
  tenantId: string
  customerId: string
  items: CartItem[]
}

interface InteractiveListPayload {
  header: string
  body: string
  footer: string
  button: string
  sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>
}

function truncateStr(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max - 3) + '...'
}

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
  private outboundQueue!: Queue<OutboundMessageJob>
  private worker!: Worker<AiMessageJob, ProcessOutput>
  private aiService!: AiService
  private openaiGenerator!: OpenAIResponseGenerator
  private readonly subscriptionsService: SubscriptionsService
  private readonly brandingService: BrandingService
  private readonly configLoader: ConfigLoaderService
  private outboundDirect!: OutboundMessageWorker

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redisConnection: Redis,
    private readonly notificationService: NotificationService,
  ) {
    this.subscriptionsService = new SubscriptionsService(this.prisma)
    this.brandingService = new BrandingService(this.prisma)
    this.configLoader = new ConfigLoaderService(this.prisma)
  }

  onModuleInit(): void {
    // Initialize queues
    this.queue = new Queue<AiMessageJob>('ai-messages', {
      connection: this.redisConnection,
    })

    this.outboundQueue = new Queue<OutboundMessageJob>('outbound-messages', {
      connection: this.redisConnection,
    })

    // Bypass BullMQ queue for outbound messages entirely.
    // Directly instantiate OutboundMessageWorker here — no DI required — and patch
    // outboundQueue.add() so every one of the 21 call sites in this class sends
    // in-process via scheduleOutbound(), avoiding Redis allkeys-lru eviction loss.
    this.outboundDirect = new OutboundMessageWorker(this.prisma, this.redisConnection, this.configLoader)
    ;(this.outboundQueue as any).add = (_name: string, data: OutboundMessageJob) => {
      this.outboundDirect.scheduleOutbound(data)
      return Promise.resolve({} as any)
    }
    this.logger.log('Outbound queue bypass ACTIVE — messages sent in-process, skipping Redis')

    // Initialize AI service
    const redisAdapter = new RedisAdapter(this.redisConnection)
    const sessionStore = new RedisSessionStore(redisAdapter)
    const router = new IntentRouter()
    const stateMachine = new StateMachine()
    const fallback = new FallbackHandler()
    const auditLogger = new AuditLogger(this.prisma)

    this.aiService = new AiService(router, stateMachine, sessionStore, fallback, auditLogger)
    this.openaiGenerator = new OpenAIResponseGenerator(this.configLoader)

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

  /**
   * Process an AI job directly in-process (fire-and-forget).
   * Used by the webhook controller to bypass the Redis BullMQ queue,
   * which is unreliable on shared hosting with allkeys-lru eviction policy.
   */
  scheduleProcess(data: AiMessageJob): void {
    this.processJob({ data } as Job<AiMessageJob>).catch((err: Error) => {
      this.logger.error(`Direct AI processing failed for message ${data.messageId}: ${err.message}`)
    })
  }

  private async processJob(job: Job<AiMessageJob>): Promise<ProcessOutput> {
    const { conversationId, messageId, tenantId, customerId, content } = job.data

    this.logger.log(`Processing message ${messageId} in conversation ${conversationId}`)

    const sessionKey = `conv_session:${conversationId}`
    const retryOpts = {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    }

    // Fetch all context upfront in a single parallel batch
    const [branding, tenantFaqs, hiddenFaqs, menuCategories, recentMessages, convo, sessionJson, botConfig] = await Promise.all([
      this.brandingService.getBranding(tenantId),
      this.prisma.tenantFaq.findMany({
        where: { tenant_id: tenantId, hidden: false },
        select: { question: true, answer: true },
        orderBy: { sort_order: 'asc' },
      }),
      this.prisma.tenantFaq.findMany({
        where: { tenant_id: tenantId, hidden: true },
        select: { question: true, answer: true },
        orderBy: { created_at: 'desc' },
        take: 20,
      }),
      this.prisma.menuCategory.findMany({
        where: { tenant_id: tenantId },
        select: {
          name: true,
          menuItems: {
            where: { available: true },
            select: { id: true, name: true, description: true, price_kobo: true, available: true },
          },
        },
      }),
      this.prisma.message.findMany({
        where: { conversation_id: conversationId },
        orderBy: { created_at: 'asc' },
        take: 10,
        select: { sender_type: true, content: true },
      }),
      this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { customer: { select: { phone: true } } },
      }),
      this.redisConnection.get(sessionKey),
      this.prisma.tenantBotConfig.findUnique({ where: { tenant_id: tenantId } }),
    ])

    const businessName = branding.name ?? 'Raven AI'
    const customerPhone = (convo as any)?.customer?.phone as string | undefined

    const catalogueItems = menuCategories.flatMap((cat) =>
      cat.menuItems.map((item) => ({
        category: cat.name,
        name: item.name,
        description: item.description,
        priceNaira: Math.round(item.price_kobo / 100),
        available: item.available,
      })),
    )

    const conversationHistory = recentMessages
      .filter((m) => m.sender_type === 'customer' || m.sender_type === 'bot' || m.sender_type === 'human')
      .map((m) => ({
        role: (m.sender_type === 'customer' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      }))

    // Parse conversation session
    let convSession: { pendingAction?: string; lastBotQuestion?: string; checkoutEmail?: string; checkoutName?: string } = {}
    try { if (sessionJson) convSession = JSON.parse(sessionJson) } catch { /* ignore */ }

    const setSession = async (data: typeof convSession) => {
      await this.redisConnection.set(sessionKey, JSON.stringify(data), 'EX', 1800)
    }
    const clearSession = async () => { await this.redisConnection.del(sessionKey) }

    const isAffirmative = /^(yes|yeah|yep|ok|okay|sure|please|go ahead|proceed|i do|i want|i would|more|tell me more)\b/i.test(content.trim())

    // â”€â”€ Cart: interactive list reply (tap on service) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (content.startsWith('__CART_ADD__:')) {
      const menuItemId = content.slice('__CART_ADD__:'.length)
      return await this.handleCartAdd({ conversationId, tenantId, customerId, customerPhone, menuItemId, retryOpts })
    }

    // â”€â”€ Cart: email capture after checkout starts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (convSession.pendingAction === 'checkout_awaiting_email') {
      return await this.handleEmailCapture({ conversationId, tenantId, customerId, customerPhone, content, retryOpts, convSession, setSession, clearSession })
    }

    // ── Cart: name capture ───────────────────────────────────────────────────
    if (convSession.pendingAction === 'checkout_awaiting_name') {
      return await this.handleNameCapture({ conversationId, tenantId, customerId, customerPhone, content, retryOpts, convSession, setSession })
    }

    // ── Cart: location capture ───────────────────────────────────────────────
    if (convSession.pendingAction === 'checkout_awaiting_location') {
      return await this.handleLocationCapture({ conversationId, tenantId, customerId, customerPhone, content, retryOpts, convSession, clearSession })
    }

    // â”€â”€ Cart: view cart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (/^(my cart|view cart|cart)\b/i.test(content.trim())) {
      return await this.handleViewCart({ conversationId, tenantId, customerId, customerPhone, retryOpts })
    }

    // â”€â”€ Cart: checkout trigger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (/^checkout\b/i.test(content.trim())) {
      return await this.handleCheckoutStart({ conversationId, tenantId, customerId, customerPhone, retryOpts, setSession, clearSession })
    }

    // â”€â”€ Session-aware flow: step 2 of help flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (convSession.pendingAction === 'help_step2') {
      await clearSession()
      const responseText = isAffirmative
        ? this.buildFaqSearchResponse('', tenantFaqs, businessName)
        : this.buildFaqSearchResponse(content, tenantFaqs, businessName)
      this.logger.log(`FAQ help flow step 2 for conversation ${conversationId}`)
      await this.tryIncrementBilling(tenantId)
      if (customerPhone) {
        await this.outboundQueue.add('send-message', {
          conversationId, tenantId, customerId,
          content: responseText, platform: 'whatsapp', to: customerPhone,
        }, retryOpts)
      }
      return { text: responseText, state: 'Validated', intent: 'HelpRequest' }
    }

    // â”€â”€ Rule-based intent detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const input: ProcessInput = {
      sessionId: conversationId,
      text: content,
      tenantId,
      userId: customerId,
      brandingName: businessName,
    }

    const output = await this.aiService.processMessage(input)
    this.logger.log(`AI intent: ${output.intent}, state: ${output.state}`)
    await this.tryIncrementBilling(tenantId)

    // â”€â”€ Smart intent handlers â€” use live DB data, bypass OpenAI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    // "What services do you offer?" â†’ formatted catalogue directly from DB
    if (output.intent === 'MenuBrowse') {
      const responseText = this.formatCatalogueResponse(catalogueItems, businessName)
      await setSession({ lastBotQuestion: responseText.split('\n')[0] })
      if (customerPhone) {
        // Message 1: text summary (immediate)
        await this.outboundQueue.add('send-message', {
          conversationId, tenantId, customerId,
          content: responseText, platform: 'whatsapp', to: customerPhone,
        }, retryOpts)

        // Message 2: interactive list for one-tap selection (800 ms later)
        // setTimeout used instead of BullMQ delay to avoid Redis allkeys-lru eviction loss
        const listPayload = this.buildInteractiveListPayload(menuCategories)
        if (listPayload) {
          const listJobData = {
            conversationId, tenantId, customerId,
            content: '', platform: 'whatsapp' as const, to: customerPhone,
            messageType: 'interactive_list' as const,
            interactiveList: listPayload,
          }
          setTimeout(() => {
            this.outboundQueue.add('send-message', listJobData, retryOpts).catch((err: Error) => {
              this.logger.warn(`Failed to enqueue interactive list: ${err.message}`)
            })
          }, 800)
        }

        this.logger.log(`Sent catalogue response for conversation ${conversationId}`)
      }
      return output
    }

    // "I need help" â†’ ask what they need; next message will search FAQs
    if (output.intent === 'HelpRequest') {
      const question = 'What would you be needing help with?'
      await setSession({ pendingAction: 'help_step2', lastBotQuestion: question })
      if (customerPhone) {
        await this.outboundQueue.add('send-message', {
          conversationId, tenantId, customerId,
          content: question, platform: 'whatsapp', to: customerPhone,
        }, retryOpts)
      }
      return output
    }

    // "What can you do?" â†’ use TenantBotConfig if configured
    if (output.intent === 'AboutInquiry' && botConfig?.about_reply_text) {
      await this.sendAboutSequence(
        { conversationId, tenantId, customerId, to: customerPhone },
        botConfig,
        retryOpts,
      )
      return output
    }

    // â”€â”€ OpenAI enhanced response (all other intents) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let responseText = output.text
    if (output.intent === 'GeneralInfo' && botConfig?.fallback_reply) {
      responseText = botConfig.fallback_reply
    }

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { theme: true },
      })
      let tenantOpenAiKey: string | undefined
      if (tenant?.theme) {
        try {
          const theme = JSON.parse(tenant.theme) as Record<string, unknown>
          if (typeof theme.OPENAI_API_KEY === 'string' && theme.OPENAI_API_KEY) {
            tenantOpenAiKey = theme.OPENAI_API_KEY
          }
        } catch { /* ignore */ }
      }

      const aiResponse = await this.openaiGenerator.generate({
        businessName,
        userMessage: content,
        intent: output.intent,
        conversationHistory,
        faqs: tenantFaqs,
        hiddenFaqs,
        catalogueItems,
        systemPromptOverride: botConfig?.system_prompt ?? undefined,
        escalationMessage: botConfig?.escalation_message ?? undefined,
        apiKey: tenantOpenAiKey,
      })
      if (aiResponse) responseText = aiResponse
    } catch (err) {
      this.logger.warn(`OpenAI generate failed, using rule-based: ${(err as Error).message}`)
    }

    // ── Detect bot-initiated escalation via [NEEDS_HUMAN] prefix ─────────
    let botDetectedEscalation = false
    if (responseText.startsWith('[NEEDS_HUMAN]')) {
      responseText = responseText.replace(/^\[NEEDS_HUMAN\]\s*/, '')
      botDetectedEscalation = true
      this.logger.log(`Bot detected escalation need for conversation ${conversationId}`)
    }

    // Store last bot reply for context on next message
    await setSession({ lastBotQuestion: responseText.slice(0, 200) })

    if (customerPhone) {
      await this.outboundQueue.add('send-message', {
        conversationId, tenantId, customerId,
        content: responseText, platform: 'whatsapp', to: customerPhone,
      }, retryOpts)
      this.logger.log(`Enqueued outbound message to ${customerPhone} for conversation ${conversationId}`)
    } else {
      this.logger.warn(`No phone number for customer ${customerId} — outbound message skipped`)
    }

    // ── Escalation side-effects ─────────────────────────────────────────────
    if (output.intent === 'EscalationRequest' || botDetectedEscalation) {
      this.handleEscalationSideEffects(conversationId, tenantId, customerId, customerPhone).catch((err) => {
        this.logger.error(`Escalation side-effects failed: ${(err as Error).message}`)
      })
    }

    return output
  }

  /**
   * Fire-and-forget side-effects triggered when a customer requests escalation.
   * - Sets conversation.status = 'escalated'
   * - Creates StaffNotification rows for all tenant users
   * - Sends push + in-app notifications to tenant users
   */
  private async handleEscalationSideEffects(
    conversationId: string,
    tenantId: string,
    customerId: string,
    customerPhone: string | undefined,
  ): Promise<void> {
    // 1. Mark conversation as escalated
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'escalated' },
    })

    // 2. Look up customer name for notification body — prefer saved contact name
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true, phone: true },
    })
    const phone = customer?.phone ?? customerPhone
    let label = customer?.name
    if (!label && phone) {
      // Check saved contacts for a friendly name
      const savedContact = await this.prisma.contact.findFirst({
        where: { tenant_id: tenantId, phone },
        select: { name: true },
      })
      label = savedContact?.name
    }
    if (!label) {
      label = phone ? `Customer ${phone.slice(-4)}` : 'A customer'
    }

    // 3. Create StaffNotification for every user in this tenant
    const tenantUsers = await this.prisma.user.findMany({
      where: { tenant_id: tenantId },
      select: { id: true },
    })

    if (tenantUsers.length) {
      await this.prisma.staffNotification.createMany({
        data: tenantUsers.map((u) => ({
          tenant_id: tenantId,
          user_id: u.id,
          message: `${label} needs your specialized assistance with this chat.`,
        })),
      })
    }

    // 4. Send push + in-app notification (high-priority) to all tenant users
    await this.notificationService.send({
      tenantId,
      title: '🔴 Human Assistance Needed',
      body: `${label} needs your specialized assistance with this chat.`,
      type: 'escalation',
      data: { conversationId, customerId, customerPhone: customerPhone ?? '' },
    })

    this.logger.log(`Escalation side-effects completed for conversation ${conversationId}`)
  }

  private async tryIncrementBilling(tenantId: string): Promise<void> {
    try {
      await this.subscriptionsService.incrementConversationCount(tenantId)
      this.logger.log(`Incremented conversation count for tenant ${tenantId}`)
    } catch (error) {
      this.logger.error(`Failed to increment conversation count: ${(error as Error).message}`)
    }
  }

  private formatCatalogueResponse(
    items: { category: string; name: string; description?: string | null; priceNaira: number }[],
    businessName: string,
  ): string {
    if (!items.length) {
      return `${businessName} - Our catalogue is being updated. Please ask for more details or speak to a team member.`
    }
    const byCategory = new Map<string, typeof items>()
    for (const item of items) {
      if (!byCategory.has(item.category)) byCategory.set(item.category, [])
      byCategory.get(item.category)!.push(item)
    }
    const lines: string[] = [`Here's what ${businessName} offers:\n`]
    for (const [cat, catItems] of byCategory) {
      lines.push(`*${cat}*`)
      for (const item of catItems) {
        const desc = item.description ? ` - ${item.description}` : ''
        lines.push(`- ${item.name}${desc}: NGN ${item.priceNaira.toLocaleString()}`)
      }
      lines.push('')
    }
    lines.push('Which would you like?')
    return lines.join('\n').trim()
  }

  private buildFaqSearchResponse(
    query: string,
    faqs: { question: string; answer: string }[],
    businessName: string,
  ): string {
    if (!faqs.length) {
      return `I don't have a knowledge base set up yet for ${businessName}. Let me connect you to a live agent who can help. Please hold on.`
    }
    if (query.trim()) {
      const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
      let best: { faq: { question: string; answer: string } | null; score: number } = { faq: null, score: 0 }
      for (const faq of faqs) {
        const haystack = `${faq.question} ${faq.answer}`.toLowerCase()
        const score = words.filter((w) => haystack.includes(w)).length
        if (score > best.score) best = { faq, score }
      }
      if (best.faq && best.score >= 1) {
        return `${best.faq.answer}\n\nAnything else I can help with?`
      }
    }
    // No match or empty/affirmative query â†’ list all FAQs
    const faqList = faqs.map((f, i) => `${i + 1}. *${f.question}*\n   ${f.answer}`).join('\n\n')
    return `Here are our FAQs:\n\n${faqList}\n\nIf you don't find the answer you're looking for, let me know and I'll connect you to a live agent.`
  }

  private async sendAboutSequence(
    params: { conversationId: string; tenantId: string; customerId: string; to: string | undefined },
    botConfig: {
      about_reply_text?: string | null
      about_image_url?: string | null
      about_cta_url?: string | null
      about_cta_label?: string | null
    },
    retryOpts: { attempts: number; backoff: { type: 'exponential'; delay: number }; removeOnComplete: number; removeOnFail: number },
  ): Promise<void> {
    if (!params.to) return

    const base = {
      conversationId: params.conversationId,
      tenantId: params.tenantId,
      customerId: params.customerId,
      platform: 'whatsapp' as const,
      to: params.to,
    }

    // Message 1: about text (immediate)
    await this.outboundQueue.add('send-message', {
      ...base,
      content: botConfig.about_reply_text!,
    }, retryOpts)

    // Message 2: image (500ms later)
    if (botConfig.about_image_url) {
      await this.outboundQueue.add('send-message', {
        ...base,
        content: '',
        messageType: 'image_link' as const,
        imageUrl: botConfig.about_image_url,
      }, { ...retryOpts, delay: 500 })
    }

    // Message 3: CTA (1500ms later)
    if (botConfig.about_cta_url) {
      const label = botConfig.about_cta_label ?? 'Start for free'
      await this.outboundQueue.add('send-message', {
        ...base,
        content: `${label}: ${botConfig.about_cta_url}`,
      }, { ...retryOpts, delay: 1500 })
    }

    this.logger.log(`Sent about sequence to ${params.to} for conversation ${params.conversationId}`)
  }

  async close(): Promise<void> {
    await this.worker.close()
    await this.queue.close()
    await this.outboundQueue.close()
    await this.outboundDirect.close()
  }

  // â”€â”€ Cart handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private async handleCartAdd(params: {
    conversationId: string
    tenantId: string
    customerId: string
    customerPhone: string | undefined
    menuItemId: string
    retryOpts: { attempts: number; backoff: { type: 'exponential'; delay: number }; removeOnComplete: number; removeOnFail: number }
  }): Promise<ProcessOutput> {
    const { conversationId, tenantId, customerId, customerPhone, menuItemId, retryOpts } = params

    const item = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, tenant_id: tenantId, available: true },
      select: { id: true, name: true, price_kobo: true, category: { select: { name: true } } },
    })

    if (!item) {
      if (customerPhone) {
        await this.outboundQueue.add('send-message', {
          conversationId, tenantId, customerId,
          content: 'Sorry, that service is no longer available. Type *services* to see our current catalogue.',
          platform: 'whatsapp', to: customerPhone,
        }, retryOpts)
      }
      return { text: 'item_not_found', intent: 'OrderDraft', state: 'Validated' }
    }

    const cartKey = `cart:${conversationId}`
    const cartJson = await this.redisConnection.get(cartKey)
    const cart: CartData = cartJson ? JSON.parse(cartJson) : { tenantId, customerId, items: [] }

    const alreadyInCart = cart.items.some((i) => i.menuItemId === menuItemId)

    if (!alreadyInCart) {
      cart.items.push({ menuItemId: item.id, name: item.name, priceKobo: item.price_kobo, category: item.category.name })
      await this.redisConnection.set(cartKey, JSON.stringify(cart), 'EX', 7200)
    }

    const suffix = alreadyInCart
      ? `*${item.name}* is already in your cart.`
      : `*${item.name}* added to your cart!`

    const replyText = `${suffix}\n\n${this.formatCartSummary(cart.items)}\n\nAdd more services or type *checkout* to pay.`

    if (customerPhone) {
      await this.outboundQueue.add('send-message', {
        conversationId, tenantId, customerId,
        content: replyText, platform: 'whatsapp', to: customerPhone,
      }, retryOpts)
    }
    await this.tryIncrementBilling(tenantId)
    return { text: replyText, intent: 'OrderDraft', state: 'Validated' }
  }

  private async handleViewCart(params: {
    conversationId: string
    tenantId: string
    customerId: string
    customerPhone: string | undefined
    retryOpts: { attempts: number; backoff: { type: 'exponential'; delay: number }; removeOnComplete: number; removeOnFail: number }
  }): Promise<ProcessOutput> {
    const { conversationId, tenantId, customerId, customerPhone, retryOpts } = params

    const cartKey = `cart:${conversationId}`
    const cartJson = await this.redisConnection.get(cartKey)
    const cart: CartData = cartJson ? JSON.parse(cartJson) : { tenantId, customerId, items: [] }

    const replyText = cart.items.length === 0
      ? 'Your cart is empty.\n\nType *services* to browse our catalogue.'
      : `${this.formatCartSummary(cart.items)}\n\nType *checkout* to pay.`

    if (customerPhone) {
      await this.outboundQueue.add('send-message', {
        conversationId, tenantId, customerId,
        content: replyText, platform: 'whatsapp', to: customerPhone,
      }, retryOpts)
    }
    return { text: replyText, intent: 'OrderDraft', state: 'Validated' }
  }

  private async handleCheckoutStart(params: {
    conversationId: string
    tenantId: string
    customerId: string
    customerPhone: string | undefined
    retryOpts: { attempts: number; backoff: { type: 'exponential'; delay: number }; removeOnComplete: number; removeOnFail: number }
    setSession: (data: Record<string, unknown>) => Promise<void>
    clearSession: () => Promise<void>
  }): Promise<ProcessOutput> {
    const { conversationId, tenantId, customerId, customerPhone, retryOpts, setSession, clearSession } = params

    const cartKey = `cart:${conversationId}`
    const cartJson = await this.redisConnection.get(cartKey)
    const cart: CartData = cartJson ? JSON.parse(cartJson) : { tenantId, customerId, items: [] }

    if (!cart.items.length) {
      if (customerPhone) {
        await this.outboundQueue.add('send-message', {
          conversationId, tenantId, customerId,
          content: 'Your cart is empty.\n\nType *services* to browse our catalogue and add items.',
          platform: 'whatsapp', to: customerPhone,
        }, retryOpts)
      }
      return { text: 'empty_cart', intent: 'OrderDraft', state: 'Validated' }
    }

    // Check if customer already has email and location on file
    const [customer, existingEntry] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: customerId }, select: { email: true } }),
      this.prisma.emailList.findFirst({ where: { tenant_id: tenantId, customer_id: customerId } }),
    ])

    if (customer?.email && existingEntry) {
      // All data on file — go straight to payment
      return await this.createOrderAndInitPayment({
        conversationId, tenantId, customerId, customerPhone,
        customerEmail: customer.email, cart, retryOpts, clearSession,
      })
    }

    if (customer?.email) {
      // Have email but need name + location
      await setSession({ pendingAction: 'checkout_awaiting_name', checkoutEmail: customer.email })
      const askNameMsg = `${this.formatCartSummary(cart.items)}\n\nBefore we proceed, what is your *full name*?`
      if (customerPhone) {
        await this.outboundQueue.add('send-message', {
          conversationId, tenantId, customerId,
          content: askNameMsg, platform: 'whatsapp', to: customerPhone,
        }, retryOpts)
      }
      return { text: askNameMsg, intent: 'OrderDraft', state: 'CollectingInfo' }
    }

    // Ask for email first
    const askEmailMsg = `${this.formatCartSummary(cart.items)}\n\nTo complete your order, please reply with your *email address* - we will send your receipt there.`
    await setSession({ pendingAction: 'checkout_awaiting_email' })

    if (customerPhone) {
      await this.outboundQueue.add('send-message', {
        conversationId, tenantId, customerId,
        content: askEmailMsg, platform: 'whatsapp', to: customerPhone,
      }, retryOpts)
    }
    return { text: askEmailMsg, intent: 'OrderDraft', state: 'CollectingInfo' }
  }

  private async handleEmailCapture(params: {
    conversationId: string
    tenantId: string
    customerId: string
    customerPhone: string | undefined
    content: string
    retryOpts: { attempts: number; backoff: { type: 'exponential'; delay: number }; removeOnComplete: number; removeOnFail: number }
    convSession: { pendingAction?: string; checkoutEmail?: string; checkoutName?: string }
    setSession: (data: Record<string, unknown>) => Promise<void>
    clearSession: () => Promise<void>
  }): Promise<ProcessOutput> {
    const { conversationId, tenantId, customerId, customerPhone, content, retryOpts, setSession } = params

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(content.trim())) {
      if (customerPhone) {
        await this.outboundQueue.add('send-message', {
          conversationId, tenantId, customerId,
          content: "That doesn't look like a valid email address. Please try again:\n\nExample: yourname@gmail.com",
          platform: 'whatsapp', to: customerPhone,
        }, retryOpts)
      }
      return { text: 'invalid_email', intent: 'OrderDraft', state: 'CollectingInfo' }
    }

    const customerEmail = content.trim().toLowerCase()
    await this.prisma.customer.update({ where: { id: customerId }, data: { email: customerEmail } })

    // Advance to name collection
    await setSession({ pendingAction: 'checkout_awaiting_name', checkoutEmail: customerEmail })

    const askNameMsg = 'Got it! Now, what is your *full name*?'
    if (customerPhone) {
      await this.outboundQueue.add('send-message', {
        conversationId, tenantId, customerId,
        content: askNameMsg, platform: 'whatsapp', to: customerPhone,
      }, retryOpts)
    }
    return { text: askNameMsg, intent: 'OrderDraft', state: 'CollectingInfo' }
  }

  private async handleNameCapture(params: {
    conversationId: string
    tenantId: string
    customerId: string
    customerPhone: string | undefined
    content: string
    retryOpts: { attempts: number; backoff: { type: 'exponential'; delay: number }; removeOnComplete: number; removeOnFail: number }
    convSession: { pendingAction?: string; checkoutEmail?: string; checkoutName?: string }
    setSession: (data: Record<string, unknown>) => Promise<void>
  }): Promise<ProcessOutput> {
    const { conversationId, tenantId, customerId, customerPhone, content, retryOpts, convSession, setSession } = params

    const name = content.trim()
    if (name.length < 2) {
      if (customerPhone) {
        await this.outboundQueue.add('send-message', {
          conversationId, tenantId, customerId,
          content: 'Please enter your full name (at least 2 characters).',
          platform: 'whatsapp', to: customerPhone,
        }, retryOpts)
      }
      return { text: 'invalid_name', intent: 'OrderDraft', state: 'CollectingInfo' }
    }

    await setSession({ pendingAction: 'checkout_awaiting_location', checkoutEmail: convSession.checkoutEmail, checkoutName: name })

    const askLocationMsg = 'Thanks! Lastly, what is your *city, state and country*?\n\nExample: Lagos, Lagos, Nigeria'
    if (customerPhone) {
      await this.outboundQueue.add('send-message', {
        conversationId, tenantId, customerId,
        content: askLocationMsg, platform: 'whatsapp', to: customerPhone,
      }, retryOpts)
    }
    return { text: askLocationMsg, intent: 'OrderDraft', state: 'CollectingInfo' }
  }

  private async handleLocationCapture(params: {
    conversationId: string
    tenantId: string
    customerId: string
    customerPhone: string | undefined
    content: string
    retryOpts: { attempts: number; backoff: { type: 'exponential'; delay: number }; removeOnComplete: number; removeOnFail: number }
    convSession: { pendingAction?: string; checkoutEmail?: string; checkoutName?: string }
    clearSession: () => Promise<void>
  }): Promise<ProcessOutput> {
    const { conversationId, tenantId, customerId, customerPhone, content, retryOpts, convSession, clearSession } = params

    // Parse "City, State, Country" — tolerate 1–3 comma-separated parts
    const parts = content.split(',').map((s) => s.trim()).filter(Boolean)
    const city    = parts[0] ?? null
    const state   = parts[1] ?? null
    const country = parts[2] ?? null

    if (!city) {
      if (customerPhone) {
        await this.outboundQueue.add('send-message', {
          conversationId, tenantId, customerId,
          content: 'Please provide at least your city.\n\nExample: Lagos, Lagos, Nigeria',
          platform: 'whatsapp', to: customerPhone,
        }, retryOpts)
      }
      return { text: 'invalid_location', intent: 'OrderDraft', state: 'CollectingInfo' }
    }

    const customerEmail = convSession.checkoutEmail ?? ''
    const customerName  = convSession.checkoutName  ?? ''

    // Save to email list
    await this.prisma.emailList.create({
      data: {
        tenant_id:   tenantId,
        customer_id: customerId,
        email:       customerEmail,
        name:        customerName,
        city,
        state,
        country,
      },
    })

    await clearSession()

    const cartKey = `cart:${conversationId}`
    const cartJson = await this.redisConnection.get(cartKey)
    const cart: CartData = cartJson ? JSON.parse(cartJson) : { tenantId, customerId, items: [] }

    if (!cart.items.length) {
      if (customerPhone) {
        await this.outboundQueue.add('send-message', {
          conversationId, tenantId, customerId,
          content: 'Your cart seems empty. Type *services* to browse our catalogue.',
          platform: 'whatsapp', to: customerPhone,
        }, retryOpts)
      }
      return { text: 'cart_empty_post_location', intent: 'OrderDraft', state: 'Validated' }
    }

    return await this.createOrderAndInitPayment({
      conversationId, tenantId, customerId, customerPhone,
      customerEmail, cart, retryOpts, clearSession: async () => {},
    })
  }

  private async createOrderAndInitPayment(params: {
    conversationId: string
    tenantId: string
    customerId: string
    customerPhone: string | undefined
    customerEmail: string
    cart: CartData
    retryOpts: { attempts: number; backoff: { type: 'exponential'; delay: number }; removeOnComplete: number; removeOnFail: number }
    clearSession: () => Promise<void>
  }): Promise<ProcessOutput> {
    const { conversationId, tenantId, customerId, customerPhone, customerEmail, cart, retryOpts } = params

    // Find or create a "WhatsApp" branch for bot orders (branch_id is required on Order)
    let branch = await this.prisma.branch.findFirst({ where: { tenant_id: tenantId, name: 'WhatsApp' } })
    if (!branch) {
      branch = await this.prisma.branch.create({ data: { tenant_id: tenantId, name: 'WhatsApp' } })
    }

    const totalKobo = cart.items.reduce((sum, i) => sum + i.priceKobo, 0)

    // Create Order + OrderItems in a single transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: { tenant_id: tenantId, branch_id: branch!.id, customer_id: customerId, total_kobo: totalKobo, status: 'pending' },
      })
      await tx.orderItem.createMany({
        data: cart.items.map((i) => ({
          tenant_id: tenantId,
          order_id: newOrder.id,
          menu_item_id: i.menuItemId,
          quantity: 1,
          price_kobo: i.priceKobo,
        })),
      })
      return newOrder
    })

    // Initialize Paystack payment
    const paystack = new PaystackService(await this.configLoader.getPaystackSecret())
    const auditLogger = new AuditLogger(this.prisma)
    const paymentService = new PaymentService(this.prisma, paystack, auditLogger, undefined, this.configLoader)

    let paymentUrl: string | null = null
    try {
      const result = await paymentService.initializePayment(tenantId, totalKobo, customerEmail, 'paystack', order.id)
      paymentUrl = result.authorizationUrl
    } catch (err) {
      this.logger.error(`Paystack initialization failed: ${(err as Error).message}`)
    }

    // Clear cart
    await this.redisConnection.del(`cart:${conversationId}`)

    if (customerPhone) {
      const cartSummary = this.formatCartSummary(cart.items)
      const totalFormatted = `NGN ${(totalKobo / 100).toLocaleString('en-NG')}`

      const msg = paymentUrl
        ? `${cartSummary}\n\n*Total: ${totalFormatted}*\n\nYour order has been created!\n\nClick below to complete payment:\n\n${paymentUrl}\n\n_Link expires in 24 hours._`
        : `${cartSummary}\n\n*Total: ${totalFormatted}*\n\nYour order (#${order.id.slice(0, 8).toUpperCase()}) has been created. A team member will follow up to arrange payment.`

      await this.outboundQueue.add('send-message', {
        conversationId, tenantId, customerId,
        content: msg, platform: 'whatsapp', to: customerPhone,
      }, retryOpts)
    }

    await this.tryIncrementBilling(tenantId)
    return { text: 'payment_link_sent', intent: 'OrderDraft', state: 'Validated' }
  }

  // â”€â”€ Cart display helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private formatCartSummary(items: CartItem[]): string {
    if (!items.length) return 'Your cart is empty.'
    const total = items.reduce((sum, i) => sum + i.priceKobo, 0)
    const lines = ['*Your Cart*']
    for (const item of items) {
      lines.push(`- ${item.name}: NGN ${(item.priceKobo / 100).toLocaleString('en-NG')}`)
    }
    lines.push(`\nTotal: NGN ${(total / 100).toLocaleString('en-NG')}`)
    return lines.join('\n')
  }

  private buildInteractiveListPayload(
    categories: Array<{ name: string; menuItems: Array<{ id: string; name: string; description?: string | null; price_kobo: number }> }>,
  ): InteractiveListPayload | null {
    // WhatsApp hard limit: max 10 rows TOTAL across all sections
    let rowsRemaining = 10
    const sections = categories
      .filter((cat) => cat.menuItems.length > 0)
      .slice(0, 10)
      .reduce<Array<{ title: string; rows: Array<{ id: string; title: string; description: string }> }>>(
        (acc, cat) => {
          if (rowsRemaining <= 0) return acc
          const rows = cat.menuItems
            .slice(0, rowsRemaining)
            .map((item) => ({
              id: item.id,
              title: truncateStr(item.name, 24),
              description: truncateStr(
                `NGN ${(item.price_kobo / 100).toLocaleString('en-NG')}${item.description ? ' - ' + item.description : ''}`,
                72,
              ),
            }))
          if (rows.length > 0) {
            rowsRemaining -= rows.length
            acc.push({ title: truncateStr(cat.name, 24), rows })
          }
          return acc
        },
        [],
      )

    if (!sections.length) return null

    return {
      header: 'Our Services',
      body: 'Tap any service to add it to your cart.\n\nWhen ready, type *checkout* to pay.',
      footer: 'Powered by Raven',
      button: 'Browse Services',
      sections,
    }
  }
}

