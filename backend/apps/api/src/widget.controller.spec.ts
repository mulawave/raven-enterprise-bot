import { ForbiddenException } from '@nestjs/common'
import { WidgetController } from './widget.controller'

function makeRequest(origin = 'https://example.com', host = 'api.raven-ai.online') {
  return {
    protocol: 'https',
    headers: {
      origin,
      'x-forwarded-for': '203.0.113.10',
    },
    ip: '203.0.113.10',
    socket: { remoteAddress: '203.0.113.10' },
    get: (name: string) => {
      const normalized = name.toLowerCase()
      if (normalized === 'origin') return origin
      if (normalized === 'referer') return origin + '/page'
      if (normalized === 'host') return host
      if (normalized === 'user-agent') return 'JestBrowser/1.0'
      return undefined
    },
  } as any
}

describe('WidgetController', () => {
  const prisma = {
    websiteAssistant: {
      findUnique: jest.fn(),
    },
    websiteVisitor: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    websiteVisitSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    websiteEvent: {
      create: jest.fn(),
    },
    websiteAssistantAlertPreference: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
    },
  }

  const redis = {
    get: jest.fn(),
    set: jest.fn(),
  }

  const notificationService = {
    send: jest.fn(),
  }

  const configLoader = {
    get: jest.fn().mockResolvedValue(null),
  }

  const controller = new WidgetController(
    prisma as any,
    redis as any,
    notificationService as any,
    configLoader as any,
  )

  beforeEach(() => {
    jest.clearAllMocks()
    redis.get.mockResolvedValue(JSON.stringify({ state: 'Idle', lastIntent: 'Greeting', tenantId: 'tenant-1', userId: null }))
    redis.set.mockResolvedValue('OK')
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }])
    prisma.websiteAssistantAlertPreference.findMany.mockResolvedValue([])
    prisma.subscription.findUnique.mockResolvedValue({ status: 'active', trial_ends_at: null, conversations_used: 0, conversations_limit: 500 })
  })

  it('returns widget config for a verified domain', async () => {
    prisma.websiteAssistant.findUnique.mockResolvedValue({
      id: 'assistant-1',
      tenant_id: 'tenant-1',
      name: 'Website Assistant',
      welcome_message: 'Hello there',
      theme_color: '#111827',
      text_color: '#F9FAFB',
      avatar_url: null,
      position: 'bottom-right',
      show_branding: true,
      collect_name: false,
      collect_email: false,
      collect_phone: false,
      handoff_enabled: true,
      domains: [{ hostname: 'example.com', verification_status: 'verified' }],
    })

    const result = await controller.getConfig('embed-key', makeRequest())

    expect(result.host).toBe('example.com')
    expect(result.name).toBe('Website Assistant')
  })

  it('rejects widget config for an unverified domain', async () => {
    prisma.websiteAssistant.findUnique.mockResolvedValue({
      id: 'assistant-1',
      tenant_id: 'tenant-1',
      name: 'Website Assistant',
      domains: [{ hostname: 'other-site.com', verification_status: 'verified' }],
    })

    await expect(controller.getConfig('embed-key', makeRequest())).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('creates a visitor session for a verified domain', async () => {
    prisma.websiteAssistant.findUnique.mockResolvedValue({
      id: 'assistant-1',
      tenant_id: 'tenant-1',
      name: 'Website Assistant',
      welcome_message: 'Hello there',
      domains: [{ hostname: 'example.com', verification_status: 'verified' }],
    })
    prisma.websiteVisitor.findFirst.mockResolvedValue(null)
    prisma.websiteVisitor.create.mockResolvedValue({ id: 'visitor-1' })
    prisma.websiteVisitSession.create.mockResolvedValue({ id: 'session-1', session_token: 'session-token' })

    const result = await controller.bootstrapSession('embed-key', makeRequest(), {
      visitorFingerprint: 'visitor-abc',
      landingUrl: 'https://example.com/',
      entryPath: '/',
      browser_name: 'JestBrowser/1.0',
      device_type: 'desktop',
      os_name: 'test-os',
    })

    expect(prisma.websiteVisitor.create).toHaveBeenCalled()
    expect(prisma.websiteVisitSession.create).toHaveBeenCalled()
    expect(notificationService.send).toHaveBeenCalled()
    expect(result.sessionToken).toBe('session-token')
  })

  it('sends a new visitor alert for first-time visitors', async () => {
    prisma.websiteAssistant.findUnique.mockResolvedValue({
      id: 'assistant-1',
      tenant_id: 'tenant-1',
      name: 'Website Assistant',
      welcome_message: 'Hello there',
      domains: [{ hostname: 'example.com', verification_status: 'verified' }],
    })
    prisma.websiteVisitor.findFirst.mockResolvedValue(null)
    prisma.websiteVisitor.create.mockResolvedValue({ id: 'visitor-1' })
    prisma.websiteVisitSession.create.mockResolvedValue({ id: 'session-1', session_token: 'session-token' })

    await controller.bootstrapSession('embed-key', makeRequest(), {
      visitorFingerprint: 'visitor-abc',
      landingUrl: 'https://example.com/',
      entryPath: '/',
      browser_name: 'JestBrowser/1.0',
      device_type: 'desktop',
      os_name: 'test-os',
    })

    expect(notificationService.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'website_new_visitor',
      title: 'New website visitor',
    }))
  })

  it('sends a lead capture alert when a lead_capture event arrives', async () => {
    prisma.websiteAssistant.findUnique.mockResolvedValue({
      id: 'assistant-1',
      tenant_id: 'tenant-1',
      name: 'Website Assistant',
      domains: [{ hostname: 'example.com', verification_status: 'verified' }],
    })
    prisma.websiteVisitSession.findFirst.mockResolvedValue({
      id: 'session-1',
      session_token: 'session-token',
      visitor_id: 'visitor-1',
      chat_opened: false,
      chat_started: false,
      lead_captured: false,
      handoff_requested: false,
    })
    prisma.websiteEvent.create.mockResolvedValue({ id: 'event-1' })
    prisma.websiteVisitSession.update.mockResolvedValue({})

    await controller.recordEvent('embed-key', makeRequest(), {
      sessionToken: 'session-token',
      eventType: 'lead_capture',
      pageUrl: 'https://example.com',
      pagePath: '/pricing',
    })

    expect(notificationService.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'website_lead_captured',
      title: 'Lead captured',
    }))
  })

  it('captures a handoff request when the AI escalates', async () => {
    prisma.websiteAssistant.findUnique.mockResolvedValue({
      id: 'assistant-1',
      tenant_id: 'tenant-1',
      name: 'Website Assistant',
      welcome_message: 'Hello there',
      domains: [{ hostname: 'example.com', verification_status: 'verified' }],
      handoff_enabled: true,
    })
    prisma.websiteVisitSession.findFirst.mockResolvedValue({
      id: 'session-1',
      session_token: 'session-token',
      visitor_id: 'visitor-1',
      chat_started: false,
      handoff_requested: false,
      event_count: 0,
    })
    prisma.websiteEvent.create.mockResolvedValue({ id: 'event-1' })
    prisma.websiteVisitSession.update.mockResolvedValue({})

    ;(controller as any).aiService = {
      processMessage: jest.fn().mockResolvedValue({
        text: 'This should be escalated',
        intent: 'EscalationRequest',
        state: 'EscalationRequested',
      }),
    }
    ;(controller as any).getAssistantKnowledge = jest.fn().mockResolvedValue({
      tenantFaqs: [],
      hiddenFaqs: [],
      catalogueItems: [],
      knowledgeSources: [],
      botConfig: undefined,
      tenantOpenAiKey: undefined,
    })
    ;(controller as any).openaiGenerator = {
      generate: jest.fn().mockResolvedValue('Please wait while I connect you to a human.'),
    }

    const result = await controller.sendMessage('embed-key', makeRequest(), {
      sessionToken: 'session-token',
      message: 'I need help',
      pageUrl: 'https://example.com',
      pagePath: '/pricing',
    })

    expect(notificationService.send).toHaveBeenCalled()
    expect(result.requiresHandoff).toBe(true)
    expect(result.reply).toBe('Please wait while I connect you to a human.')
  })

  it('returns a fallback without calling the AI when the tenant is paused', async () => {
    prisma.websiteAssistant.findUnique.mockResolvedValue({
      id: 'assistant-1',
      tenant_id: 'tenant-1',
      name: 'Website Assistant',
      domains: [{ hostname: 'example.com', verification_status: 'verified' }],
      handoff_enabled: true,
    })
    prisma.websiteVisitSession.findFirst.mockResolvedValue({
      id: 'session-1',
      session_token: 'session-token',
      visitor_id: 'visitor-1',
      chat_started: false,
    })
    prisma.subscription.findUnique.mockResolvedValue({ status: 'past_due', trial_ends_at: null, conversations_used: 0, conversations_limit: 500 })
    const processMessage = jest.fn()
    ;(controller as any).aiService = { processMessage }

    const result = await controller.sendMessage('embed-key', makeRequest(), {
      sessionToken: 'session-token',
      message: 'Hello',
    })

    expect(processMessage).not.toHaveBeenCalled()
    expect(result.requiresHandoff).toBe(false)
    expect(result.reply).toMatch(/unavailable/)
  })
})
