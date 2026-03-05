import {
  Controller, Get, Patch, Post, Body, UseGuards, Param, NotFoundException, BadRequestException
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../../libs/auth/guards/super-admin.guard'
import { ConfigLoaderService } from '../../../../libs/config/config-loader.service'
import { EmailService } from '../../../../libs/email/email.service'

interface UpdateConfigDto {
  value: string | null
}

const MASKED = '••••••••'

function maskValue(value: string | null | undefined): string | null {
  if (!value) return null
  return MASKED
}

@Controller('admin/config')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminConfigController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly configLoader: ConfigLoaderService,
    private readonly emailService: EmailService,
  ) {}

  @Get('keys')
  async getAllKeys() {
    const rows = await this.prisma.systemConfig.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    })

    // Group by group name; mask secrets
    const grouped: Record<string, any[]> = {}
    for (const row of rows) {
      if (!grouped[row.group]) grouped[row.group] = []
      grouped[row.group].push({
        id: row.id,
        key: row.key,
        value: row.is_secret ? maskValue(row.value) : (row.value ?? ''),
        description: row.description,
        group: row.group,
        is_secret: row.is_secret,
        has_value: !!row.value,
        updated_at: row.updated_at,
      })
    }

    return grouped
  }

  @Patch('keys/:key')
  async updateKey(@Param('key') key: string, @Body() body: UpdateConfigDto) {
    const existing = await this.prisma.systemConfig.findUnique({ where: { key } })

    if (!existing) {
      throw new NotFoundException(`Config key "${key}" not found`)
    }

    const updated = await this.prisma.systemConfig.update({
      where: { key },
      data: { value: body.value ?? null },
    })

    // Invalidate the in-memory cache so services pick up the new value immediately
    await this.configLoader.refresh()

    return {
      id: updated.id,
      key: updated.key,
      value: updated.is_secret ? maskValue(updated.value) : (updated.value ?? ''),
      description: updated.description,
      group: updated.group,
      is_secret: updated.is_secret,
      has_value: !!updated.value,
      updated_at: updated.updated_at,
    }
  }

  /**
   * GET /admin/config/email/templates
   * Returns all email templates (group = email_template)
   */
  @Get('email/templates')
  async getEmailTemplates() {
    const rows = await this.prisma.systemConfig.findMany({
      where: { group: 'email_template' },
      orderBy: { key: 'asc' },
    })

    return rows.map((r) => ({
      key: r.key,
      value: r.value ?? '',
      description: r.description,
      updated_at: r.updated_at,
    }))
  }

  /**
   * PATCH /admin/config/email/templates/:key
   * Update an email template HTML
   */
  @Patch('email/templates/:key')
  async updateEmailTemplate(@Param('key') key: string, @Body() body: { value: string }) {
    const existing = await this.prisma.systemConfig.findUnique({ where: { key } })
    if (!existing || existing.group !== 'email_template') {
      throw new NotFoundException(`Email template "${key}" not found`)
    }

    const updated = await this.prisma.systemConfig.update({
      where: { key },
      data: { value: body.value },
    })

    return { success: true, key: updated.key, updated_at: updated.updated_at }
  }

  /**
   * POST /admin/config/email/test
   * Send a test email to verify SMTP configuration
   */
  @Post('email/test')
  async sendTestEmail(@Body() body: { to?: string }) {
    if (!body.to || !body.to.includes('@')) {
      throw new BadRequestException('Provide a valid "to" email address')
    }

    const result = await this.emailService.sendTest(body.to)

    return result
  }
}
