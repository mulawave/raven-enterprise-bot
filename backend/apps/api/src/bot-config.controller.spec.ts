import { BotConfigController } from './bot-config.controller'

describe('BotConfigController', () => {
  const prisma = {
    tenantBotConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
  }

  const controller = new BotConfigController(prisma as any)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('falls back to legacy theme values when canonical config is missing', async () => {
    prisma.tenantBotConfig.findUnique.mockResolvedValue(null)
    prisma.tenant.findUnique.mockResolvedValue({
      theme: JSON.stringify({ BOT_ENABLED: 'true', BOT_SYSTEM_PROMPT: 'Legacy prompt' }),
    })

    const result = await controller.get({ tenant_id: 'tenant-1' })

    expect(result.enabled).toBe(true)
    expect(result.system_prompt).toBe('Legacy prompt')
    expect(result.tenant_id).toBe('tenant-1')
  })

  it('keeps canonical config but fills empty system_prompt from legacy theme during rollout', async () => {
    prisma.tenantBotConfig.findUnique.mockResolvedValue({
      id: 'cfg-1',
      tenant_id: 'tenant-1',
      enabled: false,
      system_prompt: null,
      personality_tone: 'professional',
      fallback_reply: null,
      about_reply_text: null,
      about_image_url: null,
      about_cta_url: null,
      about_cta_label: 'Start for free',
      escalation_message: "I'll have a team member reach you shortly.",
      created_at: null,
      updated_at: null,
    })
    prisma.tenant.findUnique.mockResolvedValue({
      theme: JSON.stringify({ BOT_SYSTEM_PROMPT: 'Legacy prompt' }),
    })

    const result = await controller.get({ tenant_id: 'tenant-1' })

    expect(result.system_prompt).toBe('Legacy prompt')
    expect(result.enabled).toBe(false)
  })

  it('preserves untouched canonical fields on partial writes', async () => {
    prisma.tenantBotConfig.findUnique.mockResolvedValue({
      id: 'cfg-1',
      tenant_id: 'tenant-1',
      enabled: true,
      system_prompt: 'Existing prompt',
      personality_tone: 'friendly',
      fallback_reply: 'Existing fallback',
      about_reply_text: 'Existing about text',
      about_image_url: 'https://example.com/about.png',
      about_cta_url: 'https://example.com/start',
      about_cta_label: 'Learn more',
      escalation_message: 'Existing escalation',
      created_at: null,
      updated_at: null,
    })
    prisma.tenant.findUnique.mockResolvedValue({
      theme: JSON.stringify({ BOT_ENABLED: 'false', BOT_SYSTEM_PROMPT: 'Legacy prompt' }),
    })
    prisma.tenantBotConfig.upsert.mockResolvedValue({ ok: true })

    await controller.upsert(
      { tenant_id: 'tenant-1' },
      { enabled: false },
    )

    expect(prisma.tenantBotConfig.upsert).toHaveBeenCalledWith({
      where: { tenant_id: 'tenant-1' },
      create: {
        tenant_id: 'tenant-1',
        enabled: false,
        system_prompt: 'Existing prompt',
        personality_tone: 'friendly',
        fallback_reply: 'Existing fallback',
        about_reply_text: 'Existing about text',
        about_image_url: 'https://example.com/about.png',
        about_cta_url: 'https://example.com/start',
        about_cta_label: 'Learn more',
        escalation_message: 'Existing escalation',
      },
      update: {
        enabled: false,
        system_prompt: 'Existing prompt',
        personality_tone: 'friendly',
        fallback_reply: 'Existing fallback',
        about_reply_text: 'Existing about text',
        about_image_url: 'https://example.com/about.png',
        about_cta_url: 'https://example.com/start',
        about_cta_label: 'Learn more',
        escalation_message: 'Existing escalation',
      },
    })
  })
})