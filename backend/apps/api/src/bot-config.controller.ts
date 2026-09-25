import {
  Controller, Get, Put,
  Body, UseGuards,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'

interface BotConfigBody {
  enabled?: boolean
  system_prompt?: string
  personality_tone?: string
  fallback_reply?: string
  about_reply_text?: string
  about_image_url?: string
  about_cta_url?: string
  about_cta_label?: string
  escalation_message?: string
}

function parseLegacyTheme(themeStr: string | null | undefined): Record<string, unknown> {
  if (!themeStr) return {}
  try { return JSON.parse(themeStr) as Record<string, unknown> } catch { return {} }
}

function hasOwn(body: BotConfigBody, key: keyof BotConfigBody): boolean {
  return Object.prototype.hasOwnProperty.call(body, key)
}

@Controller('api/bot-config')
@UseGuards(JwtAuthGuard)
export class BotConfigController {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * GET /api/bot-config
   * Returns TenantBotConfig if it exists.  When the row is missing (legacy
   * tenant), falls back to BOT_ENABLED / BOT_SYSTEM_PROMPT from Tenant.theme
   * so the mobile app continues to work before the migration runs.
   */
  @Get()
  async get(@CurrentUser() user: any) {
    const [config, tenant] = await Promise.all([
      this.prisma.tenantBotConfig.findUnique({
        where: { tenant_id: user.tenant_id },
      }),
      this.prisma.tenant.findUnique({
        where: { id: user.tenant_id },
        select: { theme: true },
      }),
    ])
    const theme = parseLegacyTheme(tenant?.theme)

    if (config) {
      return {
        ...config,
        system_prompt: config.system_prompt ?? (theme['BOT_SYSTEM_PROMPT'] as string) ?? null,
      }
    }

    // Legacy fallback — read from Tenant.theme JSON blob
    return {
      id: null,
      tenant_id: user.tenant_id,
      enabled: theme['BOT_ENABLED'] === 'true',
      system_prompt: (theme['BOT_SYSTEM_PROMPT'] as string) ?? null,
      personality_tone: 'professional',
      fallback_reply: null,
      about_reply_text: null,
      about_image_url: null,
      about_cta_url: null,
      about_cta_label: 'Start for free',
      escalation_message: "I'll have a team member reach you shortly.",
      created_at: null,
      updated_at: null,
    }
  }

  /**
   * PUT /api/bot-config
   * Upserts all bot config fields into TenantBotConfig (canonical).
   * The legacy Tenant.theme path is NOT updated here — it is deprecated.
   */
  @Put()
  async upsert(@CurrentUser() user: any, @Body() body: BotConfigBody) {
    const [existing, tenant] = await Promise.all([
      this.prisma.tenantBotConfig.findUnique({
        where: { tenant_id: user.tenant_id },
      }),
      this.prisma.tenant.findUnique({
        where: { id: user.tenant_id },
        select: { theme: true },
      }),
    ])
    const theme = parseLegacyTheme(tenant?.theme)

    const baseline = {
      enabled: existing?.enabled ?? (theme['BOT_ENABLED'] === 'true'),
      system_prompt: existing?.system_prompt ?? (theme['BOT_SYSTEM_PROMPT'] as string) ?? null,
      personality_tone: existing?.personality_tone ?? 'professional',
      fallback_reply: existing?.fallback_reply ?? null,
      about_reply_text: existing?.about_reply_text ?? null,
      about_image_url: existing?.about_image_url ?? null,
      about_cta_url: existing?.about_cta_url ?? null,
      about_cta_label: existing?.about_cta_label ?? 'Start for free',
      escalation_message: existing?.escalation_message ?? "I'll have a team member reach you shortly.",
    }

    const data = {
      enabled: hasOwn(body, 'enabled') ? !!body.enabled : baseline.enabled,
      system_prompt: hasOwn(body, 'system_prompt') ? (body.system_prompt ?? null) : baseline.system_prompt,
      personality_tone: hasOwn(body, 'personality_tone') ? (body.personality_tone ?? 'professional') : baseline.personality_tone,
      fallback_reply: hasOwn(body, 'fallback_reply') ? (body.fallback_reply ?? null) : baseline.fallback_reply,
      about_reply_text: hasOwn(body, 'about_reply_text') ? (body.about_reply_text ?? null) : baseline.about_reply_text,
      about_image_url: hasOwn(body, 'about_image_url') ? (body.about_image_url ?? null) : baseline.about_image_url,
      about_cta_url: hasOwn(body, 'about_cta_url') ? (body.about_cta_url ?? null) : baseline.about_cta_url,
      about_cta_label: hasOwn(body, 'about_cta_label') ? (body.about_cta_label ?? 'Start for free') : baseline.about_cta_label,
      escalation_message: hasOwn(body, 'escalation_message') ? (body.escalation_message ?? "I'll have a team member reach you shortly.") : baseline.escalation_message,
    }
    return this.prisma.tenantBotConfig.upsert({
      where: { tenant_id: user.tenant_id },
      create: { tenant_id: user.tenant_id, ...data },
      update: data,
    })
  }
}
