import {
  Controller, Get, Put,
  Body, UseGuards,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'

interface BotConfigBody {
  system_prompt?: string
  personality_tone?: string
  fallback_reply?: string
  about_reply_text?: string
  about_image_url?: string
  about_cta_url?: string
  about_cta_label?: string
  escalation_message?: string
}

@Controller('api/bot-config')
@UseGuards(JwtAuthGuard)
export class BotConfigController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  async get(@CurrentUser() user: any) {
    const config = await this.prisma.tenantBotConfig.findUnique({
      where: { tenant_id: user.tenant_id },
    })
    return config ?? {}
  }

  @Put()
  async upsert(@CurrentUser() user: any, @Body() body: BotConfigBody) {
    const data = {
      system_prompt: body.system_prompt ?? null,
      personality_tone: body.personality_tone ?? 'professional',
      fallback_reply: body.fallback_reply ?? null,
      about_reply_text: body.about_reply_text ?? null,
      about_image_url: body.about_image_url ?? null,
      about_cta_url: body.about_cta_url ?? null,
      about_cta_label: body.about_cta_label ?? 'Start for free',
      escalation_message: body.escalation_message ?? "I'll have a team member reach you shortly.",
    }
    return this.prisma.tenantBotConfig.upsert({
      where: { tenant_id: user.tenant_id },
      create: { tenant_id: user.tenant_id, ...data },
      update: data,
    })
  }
}
