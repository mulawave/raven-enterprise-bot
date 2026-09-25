import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'
import { createHash, randomBytes } from 'crypto'
import Redis from 'ioredis'
import { AiService, FallbackHandler } from '../../../libs/ai-engine/ai.service'
import { IntentRouter } from '../../../libs/ai-engine/intent.router'
import { OpenAIResponseGenerator } from '../../../libs/ai-engine/openai-response.generator'
import { RedisClient, RedisSessionStore } from '../../../libs/ai-engine/session.store'
import { StateMachine } from '../../../libs/ai-engine/state.machine'
import { AuditLogger } from '../../../libs/monitoring/audit.logger'
import { NotificationService } from '../../../libs/notifications/notification.service'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'
import { SubscriptionsService } from '../../../libs/billing/subscriptions.service'
import { KnowledgePassage, KnowledgeRetriever } from '../../../libs/knowledge/knowledge-retriever'

interface WidgetSessionDto {
  sessionToken?: string
  visitorFingerprint?: string
  landingUrl?: string
  referrerUrl?: string
  entryPath?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  browser_name?: string
  device_type?: string
  os_name?: string
  country_code?: string
  country_name?: string
  region_name?: string
  city_name?: string
}

interface WidgetEventDto {
  sessionToken?: string
  eventType?: string
  pageUrl?: string
  pagePath?: string
  eventValue?: string
  metadata?: Record<string, unknown> | null
}

interface WidgetMessageDto {
  sessionToken?: string
  message?: string
  pageUrl?: string
  pagePath?: string
}

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

function normalizeHostname(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    return new URL(withProtocol).hostname.toLowerCase()
  } catch {
    return null
  }
}

@Controller('widget')
export class WidgetController {
  private readonly aiService: AiService
  private readonly openaiGenerator: OpenAIResponseGenerator
  private readonly subscriptionsService: SubscriptionsService
  private readonly knowledgeRetriever: KnowledgeRetriever

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly notificationService: NotificationService,
    private readonly configLoader: ConfigLoaderService,
  ) {
    const sessionStore = new RedisSessionStore(new RedisAdapter(this.redis))
    this.aiService = new AiService(
      new IntentRouter(),
      new StateMachine(),
      sessionStore,
      new FallbackHandler(),
      new AuditLogger(this.prisma),
    )
    this.openaiGenerator = new OpenAIResponseGenerator(this.configLoader)
    this.subscriptionsService = new SubscriptionsService(this.prisma)
    this.knowledgeRetriever = new KnowledgeRetriever(this.prisma)
  }

  @Get('embed/:publicEmbedKey/script.js')
  async getEmbedScript(
    @Param('publicEmbedKey') publicEmbedKey: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.send(this.buildWidgetScript(this.getBaseUrl(req), publicEmbedKey))
  }

  @Get('config/:publicEmbedKey')
  async getConfig(@Param('publicEmbedKey') publicEmbedKey: string, @Req() req: Request) {
    const { assistant, host } = await this.resolveAssistantForRequest(publicEmbedKey, req)

    return {
      assistantId: assistant.id,
      tenantId: assistant.tenant_id,
      name: assistant.name,
      host,
      welcomeMessage: assistant.welcome_message,
      themeColor: assistant.theme_color,
      textColor: assistant.text_color,
      avatarUrl: assistant.avatar_url,
      position: assistant.position,
      showBranding: assistant.show_branding,
      collectName: assistant.collect_name,
      collectEmail: assistant.collect_email,
      collectPhone: assistant.collect_phone,
      handoffEnabled: assistant.handoff_enabled,
    }
  }

  @Post('session/:publicEmbedKey')
  async bootstrapSession(
    @Param('publicEmbedKey') publicEmbedKey: string,
    @Req() req: Request,
    @Body() body: WidgetSessionDto,
  ) {
    const { assistant, host } = await this.resolveAssistantForRequest(publicEmbedKey, req)
    const now = new Date()
    const fingerprint = this.getFingerprint(req, body.visitorFingerprint)

    let isNewVisitor = false
    let visitor = await this.prisma.websiteVisitor.findFirst({
      where: {
        assistant_id: assistant.id,
        visitor_fingerprint: fingerprint,
      },
    })

    if (visitor) {
      visitor = await this.prisma.websiteVisitor.update({
        where: { id: visitor.id },
        data: {
          last_seen_at: now,
          visit_count: { increment: 1 },
          is_returning: true,
          country_code: body.country_code ?? visitor.country_code,
          country_name: body.country_name ?? visitor.country_name,
          region_name: body.region_name ?? visitor.region_name,
          city_name: body.city_name ?? visitor.city_name,
          last_landing_url: body.landingUrl ?? visitor.last_landing_url,
        },
      })
    } else {
      isNewVisitor = true
      visitor = await this.prisma.websiteVisitor.create({
        data: {
          assistant_id: assistant.id,
          tenant_id: assistant.tenant_id,
          visitor_fingerprint: fingerprint,
          first_seen_at: now,
          last_seen_at: now,
          country_code: body.country_code ?? null,
          country_name: body.country_name ?? null,
          region_name: body.region_name ?? null,
          city_name: body.city_name ?? null,
          first_referrer: body.referrerUrl ?? req.get('referer') ?? null,
          first_landing_url: body.landingUrl ?? null,
          last_landing_url: body.landingUrl ?? null,
        },
      })
    }

    let session = body.sessionToken
      ? await this.prisma.websiteVisitSession.findFirst({
          where: {
            assistant_id: assistant.id,
            session_token: body.sessionToken,
          },
        })
      : null

    if (!session) {
      session = await this.prisma.websiteVisitSession.create({
        data: {
          assistant_id: assistant.id,
          visitor_id: visitor.id,
          tenant_id: assistant.tenant_id,
          session_token: randomBytes(24).toString('hex'),
          referrer_url: body.referrerUrl ?? req.get('referer') ?? null,
          landing_url: body.landingUrl ?? null,
          entry_path: body.entryPath ?? null,
          utm_source: body.utm_source ?? null,
          utm_medium: body.utm_medium ?? null,
          utm_campaign: body.utm_campaign ?? null,
          utm_term: body.utm_term ?? null,
          utm_content: body.utm_content ?? null,
          browser_name: body.browser_name ?? null,
          device_type: body.device_type ?? null,
          os_name: body.os_name ?? null,
          ip_hash: this.hashIp(req),
          ip_country_code: body.country_code ?? null,
          ip_country_name: body.country_name ?? null,
        },
      })
    }

    if (isNewVisitor) {
      await this.sendVisitorAlert(
        assistant,
        'website_new_visitor',
        'New website visitor',
        `A new visitor has arrived for ${assistant.name}.`,
        { visitorId: visitor.id, sessionId: session.id },
      )
    }

    return {
      assistantId: assistant.id,
      tenantId: assistant.tenant_id,
      verifiedHost: host,
      visitorId: visitor.id,
      sessionId: session.id,
      sessionToken: session.session_token,
      welcomeMessage: assistant.welcome_message,
    }
  }

  @Post('events/:publicEmbedKey')
  async recordEvent(
    @Param('publicEmbedKey') publicEmbedKey: string,
    @Req() req: Request,
    @Body() body: WidgetEventDto,
  ) {
    const { assistant } = await this.resolveAssistantForRequest(publicEmbedKey, req)
    const session = await this.requireSession(assistant.id, body.sessionToken)
    const eventType = body.eventType?.trim()

    if (!eventType) {
      throw new BadRequestException('eventType is required')
    }

    await this.prisma.websiteEvent.create({
      data: {
        tenant_id: assistant.tenant_id,
        assistant_id: assistant.id,
        visitor_id: session.visitor_id,
        session_id: session.id,
        event_type: eventType,
        page_url: body.pageUrl ?? null,
        page_path: body.pagePath ?? null,
        event_value: body.eventValue ?? null,
        metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      },
    })

    await this.prisma.websiteVisitSession.update({
      where: { id: session.id },
      data: {
        event_count: { increment: 1 },
        chat_opened: eventType === 'widget_open' ? true : session.chat_opened,
        lead_captured: eventType === 'lead_capture' ? true : session.lead_captured,
        handoff_requested: eventType === 'handoff_request' ? true : session.handoff_requested,
      },
    })

    if (eventType === 'lead_capture') {
      await this.sendVisitorAlert(
        assistant,
        'website_lead_captured',
        'Lead captured',
        `A visitor captured a lead on ${assistant.name}.`,
        { visitorId: session.visitor_id, sessionId: session.id },
      )
    }

    if (eventType === 'handoff_request') {
      await this.sendVisitorAlert(
        assistant,
        'website_handoff_requested',
        'Handoff requested',
        `A visitor requested a human follow-up from ${assistant.name}.`,
        { visitorId: session.visitor_id, sessionId: session.id },
      )
    }

    if (eventType === 'chat_started') {
      await this.sendVisitorAlert(
        assistant,
        'website_chat_started',
        'Chat started',
        `A visitor started a chat on ${assistant.name}.`,
        { visitorId: session.visitor_id, sessionId: session.id },
      )
    }

    return { recorded: true }
  }

  @Post('chat/:publicEmbedKey/message')
  async sendMessage(
    @Param('publicEmbedKey') publicEmbedKey: string,
    @Req() req: Request,
    @Body() body: WidgetMessageDto,
  ) {
    const { assistant } = await this.resolveAssistantForRequest(publicEmbedKey, req)
    const session = await this.requireSession(assistant.id, body.sessionToken)
    const message = body.message?.trim()

    if (!message) {
      throw new BadRequestException('message is required')
    }

    if (!(await this.subscriptionsService.canBotReply(assistant.tenant_id))) {
      return {
        reply: 'Our assistant is unavailable right now. Please leave your contact details and the team will get back to you.',
        state: 'Validated',
        intent: 'HelpRequest',
        requiresHandoff: false,
      }
    }

    if (!session.chat_started) {
      await this.prisma.websiteEvent.create({
        data: {
          tenant_id: assistant.tenant_id,
          assistant_id: assistant.id,
          visitor_id: session.visitor_id,
          session_id: session.id,
          event_type: 'chat_started',
          page_url: body.pageUrl ?? null,
          page_path: body.pagePath ?? null,
        },
      })

      await this.sendVisitorAlert(
        assistant,
        'website_chat_started',
        'Chat started',
        `A visitor started a chat on ${assistant.name}.`,
        { visitorId: session.visitor_id, sessionId: session.id },
      )
    }

    const output = await this.aiService.processMessage({
      sessionId: `website:${session.session_token}`,
      text: message,
      tenantId: assistant.tenant_id,
      userRole: 'owner',
      brandingName: assistant.name,
    })

    const [knowledge, passages] = await Promise.all([
      this.getAssistantKnowledge(assistant.id, assistant.tenant_id),
      this.knowledgeRetriever.search(assistant.tenant_id, message) as Promise<KnowledgePassage[]>,
    ])
    let reply = this.buildKnowledgeDrivenReply(message, assistant.name, output.intent, knowledge)

    if (!reply) {
      reply = output.text
    }

    const aiResponse = await this.openaiGenerator.generate({
      businessName: assistant.name,
      userMessage: message,
      intent: output.intent,
      conversationHistory: [],
      faqs: knowledge.tenantFaqs,
      hiddenFaqs: knowledge.hiddenFaqs,
      catalogueItems: knowledge.catalogueItems,
      knowledgeSources: knowledge.knowledgeSources,
      knowledgePassages: passages,
      systemPromptOverride: knowledge.botConfig?.system_prompt ?? undefined,
      escalationMessage: knowledge.botConfig?.escalation_message ?? undefined,
      apiKey: knowledge.tenantOpenAiKey,
    })

    if (aiResponse) {
      reply = aiResponse
    }

    let requiresHandoff = output.intent === 'EscalationRequest'
    if (reply.startsWith('[NEEDS_HUMAN]')) {
      reply = reply.replace(/^\[NEEDS_HUMAN\]\s*/, '')
      requiresHandoff = true
    }

    if (requiresHandoff && assistant.handoff_enabled) {
      await this.captureHandoff({
        assistantId: assistant.id,
        assistantName: assistant.name,
        tenantId: assistant.tenant_id,
        sessionId: session.id,
        sessionToken: session.session_token,
        visitorId: session.visitor_id,
        message,
      })
    }

    await this.prisma.websiteVisitSession.update({
      where: { id: session.id },
      data: {
        event_count: { increment: session.chat_started ? 0 : 1 },
        chat_opened: true,
        chat_started: true,
        handoff_requested: requiresHandoff ? true : session.handoff_requested,
      },
    })

    return {
      reply,
      state: output.state,
      intent: output.intent,
      requiresHandoff,
      // Pages the answer could draw on, for "From: …" links under the reply
      sources: aiResponse ? uniqueSources(passages) : [],
    }
  }

  private async getAssistantKnowledge(assistantId: string, tenantId: string) {
    const [tenantFaqs, hiddenFaqs, menuCategories, botConfig, assistant, tenant] = await Promise.all([
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
            select: { name: true, description: true, price_kobo: true, available: true },
          },
        },
      }),
      this.prisma.tenantBotConfig.findUnique({ where: { tenant_id: tenantId } }),
      this.prisma.websiteAssistant.findUnique({
        where: { id: assistantId },
        select: {
          knowledgeSources: {
            where: { is_enabled: true },
            select: { source_type: true, source_label: true, source_url: true },
            orderBy: { created_at: 'asc' },
          },
        },
      }),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { theme: true } }),
    ])

    const catalogueItems = menuCategories.flatMap((category) =>
      category.menuItems.map((item) => ({
        category: category.name,
        name: item.name,
        description: item.description,
        priceNaira: Math.round(item.price_kobo / 100),
        available: item.available,
      })),
    )

    let tenantOpenAiKey: string | undefined
    if (tenant?.theme) {
      try {
        const theme = JSON.parse(tenant.theme) as Record<string, unknown>
        if (typeof theme.OPENAI_API_KEY === 'string' && theme.OPENAI_API_KEY) {
          tenantOpenAiKey = theme.OPENAI_API_KEY
        }
      } catch {
        tenantOpenAiKey = undefined
      }
    }

    return {
      tenantFaqs,
      hiddenFaqs,
      catalogueItems,
      botConfig,
      tenantOpenAiKey,
      knowledgeSources: assistant?.knowledgeSources ?? [],
    }
  }

  private buildKnowledgeDrivenReply(
    message: string,
    businessName: string,
    intent: string,
    knowledge: {
      tenantFaqs: Array<{ question: string; answer: string }>
      catalogueItems: Array<{ category: string; name: string; description?: string | null; priceNaira: number; available: boolean }>
    },
  ) {
    if (intent === 'MenuBrowse' && knowledge.catalogueItems.length > 0) {
      const preview = knowledge.catalogueItems
        .slice(0, 6)
        .map((item) => {
          const description = item.description ? ` - ${item.description}` : ''
          return `• ${item.name}${description}: NGN ${item.priceNaira.toLocaleString('en-NG')}`
        })
        .join('\n')
      return `${businessName} can help with these offers right now:\n${preview}\n\nWhich option would you like to explore?`
    }

    if (knowledge.tenantFaqs.length > 0) {
      const faqReply = this.buildFaqSearchResponse(message, knowledge.tenantFaqs)
      if (faqReply) {
        return faqReply
      }
    }

    if ((intent === 'PriceInquiry' || intent === 'AvailabilityInquiry') && knowledge.catalogueItems.length > 0) {
      const best = knowledge.catalogueItems.find((item) => {
        const haystack = `${item.category} ${item.name} ${item.description ?? ''}`.toLowerCase()
        return message.toLowerCase().split(/\s+/).some((term) => term.length > 2 && haystack.includes(term))
      })
      if (best) {
        return `${best.name} is currently ${best.available ? 'available' : 'unavailable'} at NGN ${best.priceNaira.toLocaleString('en-NG')}.${best.description ? ` ${best.description}.` : ''} Would you like help taking the next step?`
      }
    }

    return null
  }

  private buildFaqSearchResponse(
    userMessage: string,
    faqs: Array<{ question: string; answer: string }>,
  ) {
    if (!faqs.length) return null

    const query = userMessage.trim().toLowerCase()
    let best: { faq: { question: string; answer: string } | null; score: number } = { faq: null, score: 0 }

    for (const faq of faqs) {
      const haystack = `${faq.question} ${faq.answer}`.toLowerCase()
      const score = query
        .split(/\s+/)
        .filter((term) => term.length > 2 && haystack.includes(term))
        .length
      if (score > best.score) {
        best = { faq, score }
      }
    }

    if (best.faq && best.score >= 1) {
      return `${best.faq.answer}\n\nAnything else I can help with?`
    }

    return null
  }

  private async captureHandoff(params: {
    assistantId: string
    assistantName: string
    tenantId: string
    sessionId: string
    sessionToken: string
    visitorId: string
    message: string
  }) {
    await this.prisma.websiteEvent.create({
      data: {
        tenant_id: params.tenantId,
        assistant_id: params.assistantId,
        visitor_id: params.visitorId,
        session_id: params.sessionId,
        event_type: 'handoff_request',
        event_value: params.message,
      },
    })

    await this.notificationService.send({
      tenantId: params.tenantId,
      title: 'Website assistant handoff requested',
      body: `${params.assistantName} requested a human follow-up from an embedded website conversation.`,
      type: 'website_handoff_requested',
      data: {
        assistantId: params.assistantId,
        sessionId: params.sessionId,
        sessionToken: params.sessionToken,
      },
    })
  }

  private getAlertPreferenceField(eventType: string) {
    switch (eventType) {
      case 'website_new_visitor':
        return 'notify_new_visitor'
      case 'website_chat_started':
        return 'notify_chat_started'
      case 'website_lead_captured':
        return 'notify_lead_captured'
      case 'website_handoff_requested':
        return 'notify_handoff_requested'
      default:
        return 'notify_new_visitor'
    }
  }

  private async resolveAlertRecipients(assistantId: string, tenantId: string, eventType: string) {
    const users = await this.prisma.user.findMany({
      where: { tenant_id: tenantId },
      select: { id: true },
    })

    if (!users.length) {
      return []
    }

    const preferences: Array<Record<string, any>> = await this.prisma.websiteAssistantAlertPreference.findMany({
      where: {
        assistant_id: assistantId,
        user_id: { in: users.map((user) => user.id) },
      },
    })

    const preferenceByUser = new Map(preferences.map((preference: any) => [preference.user_id, preference]))
    const field = this.getAlertPreferenceField(eventType)

    return users
      .filter((user) => {
        const preference = preferenceByUser.get(user.id)
        return preference ? preference[field] : true
      })
      .map((user) => user.id)
  }

  private async sendVisitorAlert(
    assistant: any,
    eventType: 'website_new_visitor' | 'website_chat_started' | 'website_lead_captured' | 'website_handoff_requested',
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const userIds = await this.resolveAlertRecipients(assistant.id, assistant.tenant_id, eventType)
    if (!userIds.length) {
      return
    }

    await this.notificationService.send({
      userIds,
      title,
      body,
      type: eventType,
      data,
    })
  }

  private async resolveAssistantForRequest(publicEmbedKey: string, req: Request) {
    const assistant = await this.prisma.websiteAssistant.findUnique({
      where: { public_embed_key: publicEmbedKey },
      include: {
        domains: true,
      },
    })

    if (!assistant) {
      throw new ForbiddenException('Widget is not available')
    }

    const host = this.extractHost(req)
    if (!host) {
      throw new ForbiddenException('Request origin is missing')
    }

    const verifiedHosts = assistant.domains
      .filter((domain) => domain.verification_status === 'verified')
      .map((domain) => domain.hostname.toLowerCase())

    const allowed = verifiedHosts.some((verifiedHost) => this.hostMatches(host, verifiedHost))
    if (!allowed) {
      throw new ForbiddenException('Origin domain is not verified for this widget')
    }

    return { assistant, host }
  }

  private async requireSession(assistantId: string, sessionToken?: string) {
    if (!sessionToken?.trim()) {
      throw new BadRequestException('sessionToken is required')
    }

    const session = await this.prisma.websiteVisitSession.findFirst({
      where: {
        assistant_id: assistantId,
        session_token: sessionToken,
      },
    })

    if (!session) {
      throw new BadRequestException('Session not found')
    }

    return session
  }

  private extractHost(req: Request): string | null {
    const origin = req.get('origin')
    const referer = req.get('referer')
    const originHost = origin ? normalizeHostname(origin) : null
    if (originHost) return originHost
    return referer ? normalizeHostname(referer) : null
  }

  private hostMatches(host: string, verifiedHost: string): boolean {
    return host === verifiedHost || host === `www.${verifiedHost}` || verifiedHost === `www.${host}`
  }

  private getFingerprint(req: Request, provided?: string) {
    const raw = provided?.trim() || `${req.get('user-agent') ?? 'unknown'}:${this.hashIp(req) ?? 'no-ip'}`
    return createHash('sha256').update(raw).digest('hex')
  }

  private hashIp(req: Request) {
    const forwarded = req.headers['x-forwarded-for']
    const ip = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.ip || req.socket.remoteAddress || ''

    if (!ip) return null
    return createHash('sha256').update(ip).digest('hex')
  }

  private getBaseUrl(req: Request): string {
    const forwardedProto = req.headers['x-forwarded-proto']
    const protocol = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : req.protocol
    return `${protocol}://${req.get('host')}`.replace(/\/$/, '')
  }

  private buildWidgetScript(baseUrl: string, publicEmbedKey: string): string {
    return `(function () {
  if (window.__RAVEN_WIDGET_LOADED__) return;
  window.__RAVEN_WIDGET_LOADED__ = true;

  var apiBase = '${baseUrl}';
  var publicEmbedKey = '${publicEmbedKey}';
  var storageKey = 'raven-widget-session-' + publicEmbedKey;
  var fingerprintKey = 'raven-widget-fingerprint-' + publicEmbedKey;
  var state = { config: null, sessionToken: null, open: false, loaded: false };

  function getFingerprint() {
    var existing = window.localStorage.getItem(fingerprintKey);
    if (existing) return existing;
    var created = 'fp-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.localStorage.setItem(fingerprintKey, created);
    return created;
  }

  function getSessionToken() {
    return window.localStorage.getItem(storageKey);
  }

  function setSessionToken(token) {
    state.sessionToken = token;
    window.localStorage.setItem(storageKey, token);
  }

  function postJson(path, body) {
    return fetch(apiBase + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    }).then(function (response) {
      if (!response.ok) throw new Error('Widget request failed');
      return response.json();
    });
  }

  function bootstrapSession() {
    if (state.sessionToken) return Promise.resolve(state.sessionToken);
    return postJson('/widget/session/' + publicEmbedKey, {
      sessionToken: getSessionToken(),
      visitorFingerprint: getFingerprint(),
      landingUrl: window.location.href,
      referrerUrl: document.referrer || null,
      entryPath: window.location.pathname,
      browser_name: navigator.userAgent,
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      os_name: navigator.platform || null,
    }).then(function (payload) {
      setSessionToken(payload.sessionToken);
      return payload.sessionToken;
    });
  }

  var button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Chat';
  button.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:999999;border:none;border-radius:999px;padding:14px 18px;background:#111827;color:#F9FAFB;font:600 14px/1.2 sans-serif;box-shadow:0 12px 32px rgba(15,23,42,.22);cursor:pointer;';

  var panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;right:24px;bottom:84px;z-index:999999;width:min(360px,calc(100vw - 32px));height:480px;background:#ffffff;border-radius:20px;box-shadow:0 24px 64px rgba(15,23,42,.22);display:none;overflow:hidden;border:1px solid rgba(15,23,42,.08);';

  var header = document.createElement('div');
  header.style.cssText = 'padding:16px 18px;background:#111827;color:#F9FAFB;font:600 15px/1.3 sans-serif;';
  header.textContent = 'Assistant';

  var messages = document.createElement('div');
  messages.style.cssText = 'height:360px;overflow:auto;padding:16px;background:linear-gradient(180deg,#f8fafc 0%,#ffffff 100%);font:14px/1.5 sans-serif;';

  var composer = document.createElement('form');
  composer.style.cssText = 'display:flex;gap:8px;padding:12px;border-top:1px solid rgba(15,23,42,.08);background:#fff;';

  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Ask a question';
  input.style.cssText = 'flex:1;border:1px solid rgba(15,23,42,.12);border-radius:12px;padding:12px 14px;font:14px/1.2 sans-serif;outline:none;';

  var send = document.createElement('button');
  send.type = 'submit';
  send.textContent = 'Send';
  send.style.cssText = 'border:none;border-radius:12px;padding:0 16px;background:#111827;color:#F9FAFB;font:600 14px/1.2 sans-serif;cursor:pointer;';

  composer.appendChild(input);
  composer.appendChild(send);
  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(composer);
  document.body.appendChild(button);
  document.body.appendChild(panel);

  function appendMessage(text, role) {
    var bubble = document.createElement('div');
    bubble.textContent = text;
    bubble.style.cssText = 'max-width:82%;margin-bottom:10px;padding:10px 12px;border-radius:14px;font:14px/1.5 sans-serif;white-space:pre-wrap;';
    if (role === 'user') {
      bubble.style.marginLeft = 'auto';
      bubble.style.background = '#111827';
      bubble.style.color = '#F9FAFB';
    } else {
      bubble.style.background = '#E5E7EB';
      bubble.style.color = '#111827';
    }
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function appendSources(sources) {
    if (!sources || !sources.length) return;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'max-width:82%;margin:-4px 0 10px;font:12px/1.4 sans-serif;color:#6B7280;';
    wrap.appendChild(document.createTextNode('From: '));
    sources.forEach(function (source, i) {
      if (!/^https?:/i.test(source.url || '')) return;
      if (i > 0) wrap.appendChild(document.createTextNode(' · '));
      var link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = source.title || source.url;
      link.style.color = 'inherit';
      wrap.appendChild(link);
    });
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  function ensureConfig() {
    if (state.config) return Promise.resolve(state.config);
    return fetch(apiBase + '/widget/config/' + publicEmbedKey)
      .then(function (response) {
        if (!response.ok) throw new Error('Widget config failed');
        return response.json();
      })
      .then(function (config) {
        state.config = config;
        header.textContent = config.name || 'Assistant';
        button.style.background = config.themeColor || '#111827';
        if (config.welcomeMessage) appendMessage(config.welcomeMessage, 'assistant');
        return config;
      });
  }

  function openWidget() {
    panel.style.display = 'block';
    state.open = true;
    ensureConfig()
      .then(function () { return bootstrapSession(); })
      .then(function () {
        return postJson('/widget/events/' + publicEmbedKey, {
          sessionToken: state.sessionToken,
          eventType: 'widget_open',
          pageUrl: window.location.href,
          pagePath: window.location.pathname,
        });
      })
      .catch(function () {
        appendMessage('This assistant is not available on the current domain yet.', 'assistant');
      });
  }

  button.addEventListener('click', function () {
    if (state.open) {
      panel.style.display = 'none';
      state.open = false;
      return;
    }
    openWidget();
  });

  composer.addEventListener('submit', function (event) {
    event.preventDefault();
    var value = input.value.trim();
    if (!value) return;
    input.value = '';
    appendMessage(value, 'user');
    ensureConfig()
      .then(function () { return bootstrapSession(); })
      .then(function () {
        return postJson('/widget/chat/' + publicEmbedKey + '/message', {
          sessionToken: state.sessionToken,
          message: value,
          pageUrl: window.location.href,
          pagePath: window.location.pathname,
        });
      })
      .then(function (payload) {
        appendMessage(payload.reply || 'How can I help?', 'assistant');
        appendSources(payload.sources);
      })
      .catch(function () {
        appendMessage('Something went wrong. Please try again.', 'assistant');
      });
  });
})();`
  }
}

function uniqueSources(passages: KnowledgePassage[]): { title: string; url: string }[] {
  const seen = new Set<string>()
  const out: { title: string; url: string }[] = []
  for (const p of passages) {
    if (!p.url || seen.has(p.url)) continue
    seen.add(p.url)
    out.push({ title: p.title ?? p.url, url: p.url })
    if (out.length >= 3) break
  }
  return out
}
