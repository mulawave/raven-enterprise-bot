import {
  Controller, Get, Post, Body, UseGuards,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'

const KEY_FIELDS = [
  'META_APP_SECRET',
  'META_WEBHOOK_VERIFY_TOKEN',
  'META_ACCESS_TOKEN',
  'META_PHONE_NUMBER_ID',
  'OPENAI_API_KEY',
] as const

type KeyField = (typeof KEY_FIELDS)[number]

function parseTheme(themeStr: string | null | undefined): Record<string, unknown> {
  if (!themeStr) return {}
  try { return JSON.parse(themeStr) as Record<string, unknown> } catch { return {} }
}

@Controller('api/settings')
@UseGuards(JwtAuthGuard)
export class TenantKeysController {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * GET /api/settings/keys
   * Returns each key name + current value for the authenticated tenant.
   */
  @Get('keys')
  async getKeys(@CurrentUser() user: any) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenant_id } })
    const theme = parseTheme(tenant?.theme)

    return KEY_FIELDS.map((key) => ({
      key,
      has_value: !!(theme[key] as string | undefined),
      value: (theme[key] as string) ?? '',
    }))
  }

  /**
   * POST /api/settings/keys
   * Body: { keys: Array<{ key: string; value: string }> }
   * Saves non-empty values into Tenant.theme (merges with existing theme).
   */
  @Post('keys')
  async saveKeys(
    @CurrentUser() user: any,
    @Body() body: { keys: Array<{ key: string; value: string }> },
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenant_id } })
    const theme = parseTheme(tenant?.theme)

    const allowedSet = new Set<string>(KEY_FIELDS)

    for (const entry of body.keys ?? []) {
      if (!allowedSet.has(entry.key)) continue
      if (entry.value?.trim()) {
        theme[entry.key as KeyField] = entry.value.trim()
      }
    }

    await this.prisma.tenant.update({
      where: { id: user.tenant_id },
      data: { theme: JSON.stringify(theme) },
    })

    return { saved: true }
  }

  /**
   * GET /api/settings/bot
   * Returns the bot configuration (enable flag + system prompt).
   */
  @Get('bot')
  async getBotSettings(@CurrentUser() user: any) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenant_id } })
    const theme = parseTheme(tenant?.theme)
    return {
      enabled: theme['BOT_ENABLED'] === 'true',
      systemPrompt: (theme['BOT_SYSTEM_PROMPT'] as string) ?? '',
      hasOpenAiKey: !!(theme['OPENAI_API_KEY'] as string),
      hasWaConfig: !!(theme['META_ACCESS_TOKEN'] as string) && !!(theme['META_PHONE_NUMBER_ID'] as string),
    }
  }

  /**
   * POST /api/settings/bot
   * Body: { enabled?: boolean; systemPrompt?: string }
   */
  @Post('bot')
  async saveBotSettings(
    @CurrentUser() user: any,
    @Body() body: { enabled?: boolean; systemPrompt?: string },
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenant_id } })
    const theme = parseTheme(tenant?.theme)
    if (body.enabled !== undefined) theme['BOT_ENABLED'] = body.enabled ? 'true' : 'false'
    if (body.systemPrompt !== undefined) theme['BOT_SYSTEM_PROMPT'] = body.systemPrompt
    await this.prisma.tenant.update({
      where: { id: user.tenant_id },
      data: { theme: JSON.stringify(theme) },
    })
    return { saved: true }
  }

  /**
   * GET /api/settings/wa-info
   * Returns non-sensitive WhatsApp account info for the connected account.
   */
  @Get('wa-info')
  async getWaInfo(@CurrentUser() user: any) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenant_id } })
    const theme = parseTheme(tenant?.theme)
    return {
      phoneNumberId: (theme['META_PHONE_NUMBER_ID'] as string) ?? null,
      isConfigured: !!(theme['META_ACCESS_TOKEN'] as string) && !!(theme['META_PHONE_NUMBER_ID'] as string) && !!(theme['META_APP_SECRET'] as string),
    }
  }
}
