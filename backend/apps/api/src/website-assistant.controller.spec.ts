import { WebsiteAssistantController } from './website-assistant.controller'

function makeRequest(host = 'api.raven-ai.online') {
  return {
    protocol: 'https',
    headers: {},
    get: (name: string) => {
      if (name.toLowerCase() === 'host') return host
      return undefined
    },
  } as any
}

describe('WebsiteAssistantController', () => {
  const prisma = {
    tenant: {
      findUnique: jest.fn(),
    },
    websiteAssistant: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    websiteAssistantDomain: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    websiteAssistantAlertPreference: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    websiteVisitor: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    websiteVisitSession: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    websiteEvent: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  }

  const notificationService = {
    send: jest.fn(),
  }

  const controller = new WebsiteAssistantController(prisma as any, notificationService as any)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates an assistant with a hosted embed script url and code', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', name: 'Acme', logo_url: null })
    prisma.websiteAssistant.create.mockResolvedValue({
      id: 'assistant-1',
      tenant_id: 'tenant-1',
      name: 'Acme Assistant',
      status: 'draft',
      public_embed_key: 'embed-key',
      welcome_message: 'Hi',
      theme_color: '#111827',
      text_color: '#F9FAFB',
      avatar_url: null,
      position: 'bottom-right',
      show_branding: true,
      collect_name: false,
      collect_email: false,
      collect_phone: false,
      handoff_enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
      domains: [],
      knowledgeSources: [],
    })

    const result = await controller.create(
      { tenant_id: 'tenant-1', scope: 'TENANT' },
      { name: 'Acme Assistant' },
      makeRequest(),
    )

    expect(prisma.websiteAssistant.create).toHaveBeenCalled()
    expect(result.embed_script_url).toBe('https://api.raven-ai.online/widget/embed/embed-key/script.js')
    expect(result.embed_code).toBe('<script async src="https://api.raven-ai.online/widget/embed/embed-key/script.js"></script>')
  })

  it('normalizes domains on add and verifies using the saved token', async () => {
    prisma.websiteAssistant.findFirst.mockResolvedValue({
      id: 'assistant-1',
      tenant_id: 'tenant-1',
      domains: [],
      knowledgeSources: [],
    })
    prisma.websiteAssistantDomain.findFirst.mockResolvedValueOnce(null)
    prisma.websiteAssistantDomain.create.mockResolvedValue({
      id: 'domain-1',
      assistant_id: 'assistant-1',
      hostname: 'example.com',
      verification_status: 'pending',
      verification_token: 'verify-token',
    })
    prisma.websiteAssistantDomain.findFirst.mockResolvedValueOnce({
      id: 'domain-1',
      assistant_id: 'assistant-1',
      hostname: 'example.com',
      verification_status: 'pending',
      verification_token: 'verify-token',
    })
    prisma.websiteAssistantDomain.update.mockResolvedValue({
      id: 'domain-1',
      verification_status: 'verified',
      verified_at: new Date(),
    })

    const created = await controller.addDomain(
      { tenant_id: 'tenant-1', scope: 'TENANT' },
      'assistant-1',
      { hostname: 'https://Example.com/pricing' },
    )

    expect(prisma.websiteAssistantDomain.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ hostname: 'example.com' }),
      }),
    )
    expect(created.hostname).toBe('example.com')

    const verified = await controller.verifyDomain(
      { tenant_id: 'tenant-1', scope: 'TENANT' },
      'assistant-1',
      'domain-1',
      { token: 'verify-token' },
    )

    expect(verified.verification_status).toBe('verified')
  })

  it('returns default alert preferences when none are saved', async () => {
    prisma.websiteAssistant.findFirst.mockResolvedValue({ id: 'assistant-1', tenant_id: 'tenant-1' })
    prisma.websiteAssistantAlertPreference = {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    }

    const preferences = await controller.getAlertPreferences(
      { tenant_id: 'tenant-1', scope: 'TENANT', id: 'user-1' },
      'assistant-1',
    )

    expect(preferences.notify_new_visitor).toBe(true)
    expect(preferences.notify_chat_started).toBe(true)
    expect(preferences.notify_lead_captured).toBe(true)
    expect(preferences.notify_handoff_requested).toBe(true)
  })

  it('returns analytics summary for an assistant', async () => {
    prisma.websiteAssistant.findFirst.mockResolvedValue({ id: 'assistant-1', tenant_id: 'tenant-1' })
    prisma.websiteVisitor.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(5)
    prisma.websiteVisitSession.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(14)
      .mockResolvedValueOnce(7)
    prisma.websiteEvent.count.mockResolvedValueOnce(84)
    prisma.websiteVisitSession.findMany.mockResolvedValue([{ started_at: new Date('2026-05-26T00:00:00Z') }])
    prisma.websiteEvent.groupBy.mockResolvedValue([{ page_path: '/pricing', _count: { page_path: 18 } }])

    const summary = await controller.getAnalyticsSummary(
      { tenant_id: 'tenant-1', scope: 'TENANT' },
      'assistant-1',
    )

    expect(summary.totalVisitors).toBe(12)
    expect(summary.returningVisitors).toBe(5)
    expect(summary.totalSessions).toBe(20)
    expect(summary.totalEvents).toBe(84)
    expect(summary.topPaths[0]).toEqual({ path: '/pricing', count: 18 })
  })

  it('returns visitor list and event list', async () => {
    prisma.websiteAssistant.findFirst.mockResolvedValue({ id: 'assistant-1', tenant_id: 'tenant-1' })
    prisma.websiteVisitor.findMany.mockResolvedValue([
      {
        id: 'visitor-1',
        visitor_fingerprint: 'fingerprint-1',
        first_seen_at: new Date('2026-05-24T12:00:00Z'),
        last_seen_at: new Date('2026-05-25T12:00:00Z'),
        visit_count: 2,
        is_returning: true,
        country_code: 'NG',
        country_name: 'Nigeria',
        region_name: 'Lagos',
        city_name: 'Ikeja',
        first_referrer: 'https://google.com',
        first_landing_url: 'https://example.com',
        last_landing_url: 'https://example.com/pricing',
        sessions: [
          {
            id: 'session-1',
            session_token: 'token-1',
            started_at: new Date('2026-05-25T12:00:00Z'),
            event_count: 3,
            chat_started: true,
            lead_captured: false,
            handoff_requested: false,
          },
        ],
      },
    ])
    prisma.websiteEvent.findMany.mockResolvedValue([
      {
        id: 'event-1',
        visitor_id: 'visitor-1',
        session_id: 'session-1',
        event_type: 'chat_started',
        page_url: 'https://example.com',
        page_path: '/pricing',
        event_value: null,
        metadata: null,
        occurred_at: new Date('2026-05-25T12:00:00Z'),
      },
    ])

    const visitors = await controller.getAnalyticsVisitors(
      { tenant_id: 'tenant-1', scope: 'TENANT' },
      'assistant-1',
      { query: {} } as any,
    )
    const events = await controller.getAnalyticsEvents(
      { tenant_id: 'tenant-1', scope: 'TENANT' },
      'assistant-1',
      { query: {} } as any,
    )

    expect(visitors[0].visitor_fingerprint).toBe('fingerprint-1')
    expect(events[0].event_type).toBe('chat_started')
  })
})