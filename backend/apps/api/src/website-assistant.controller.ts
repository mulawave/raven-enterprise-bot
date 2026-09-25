import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { PrismaClient, UserScope } from '@prisma/client'
import { Request } from 'express'
import { randomBytes } from 'crypto'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'
import { NotificationService } from '../../../libs/notifications/notification.service'

interface CreateWebsiteAssistantDto {
  name?: string
  status?: string
  welcome_message?: string | null
  theme_color?: string | null
  text_color?: string | null
  avatar_url?: string | null
  position?: string
  show_branding?: boolean
  collect_name?: boolean
  collect_email?: boolean
  collect_phone?: boolean
  handoff_enabled?: boolean
}

interface UpdateWebsiteAssistantDto extends CreateWebsiteAssistantDto {}

interface AddDomainDto {
  hostname?: string
}

interface VerifyDomainDto {
  token?: string
}

interface UpdateAlertPreferencesDto {
  notify_new_visitor?: boolean
  notify_chat_started?: boolean
  notify_lead_captured?: boolean
  notify_handoff_requested?: boolean
}

interface HandoffRequestDto {
  message?: string
}

function parseLimit(raw: string | undefined, fallback: number, max: number) {
  const parsed = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

function requireTenantId(user: any): string {
  if (user?.scope !== UserScope.TENANT || !user?.tenant_id) {
    throw new UnauthorizedException('Tenant credentials required')
  }
  return user.tenant_id
}

function normalizeHostname(input: string | undefined | null): string {
  const raw = input?.trim()
  if (!raw) {
    throw new BadRequestException('hostname is required')
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    const parsed = new URL(withProtocol)
    return parsed.hostname.toLowerCase()
  } catch {
    throw new BadRequestException('hostname must be a valid domain')
  }
}

function buildWidgetBaseUrl(req: Request): string {
  const forwardedProto = req.headers['x-forwarded-proto']
  const protocol = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : req.protocol
  const host = req.get('host')
  const envBase = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (envBase) {
    return envBase.replace(/\/$/, '')
  }

  return `${protocol}://${host}`.replace(/\/$/, '')
}

@Controller('api/website-assistant')
@UseGuards(JwtAuthGuard)
export class WebsiteAssistantController {
  constructor(private readonly prisma: PrismaClient, private readonly notificationService: NotificationService) {}

  @Get()
  async list(@CurrentUser() user: any, @Req() req: Request) {
    const tenantId = requireTenantId(user)
    const widgetBaseUrl = buildWidgetBaseUrl(req)
    const assistants = await this.prisma.websiteAssistant.findMany({
      where: { tenant_id: tenantId },
      include: {
        domains: { orderBy: { created_at: 'asc' } },
        knowledgeSources: { orderBy: { created_at: 'asc' } },
      },
      orderBy: { updated_at: 'desc' },
    })

    return assistants.map((assistant) => this.serializeAssistant(assistant, widgetBaseUrl))
  }

  @Get(':id')
  async getOne(@CurrentUser() user: any, @Param('id') id: string, @Req() req: Request) {
    const tenantId = requireTenantId(user)
    const assistant = await this.findTenantAssistantOrThrow(tenantId, id)
    return this.serializeAssistant(assistant, buildWidgetBaseUrl(req))
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() body: CreateWebsiteAssistantDto, @Req() req: Request) {
    const tenantId = requireTenantId(user)
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
    const name = body.name?.trim() || `${tenant?.name ?? 'Website'} Assistant`
    const publicEmbedKey = randomBytes(24).toString('hex')

    const assistant = await this.prisma.websiteAssistant.create({
      data: {
        tenant_id: tenantId,
        name,
        status: body.status?.trim() || 'draft',
        public_embed_key: publicEmbedKey,
        welcome_message: body.welcome_message ?? `Hi, welcome to ${tenant?.name ?? 'our business'}! How can I help today?`,
        theme_color: body.theme_color ?? '#111827',
        text_color: body.text_color ?? '#F9FAFB',
        avatar_url: body.avatar_url ?? tenant?.logo_url ?? null,
        position: body.position?.trim() || 'bottom-right',
        show_branding: body.show_branding ?? true,
        collect_name: body.collect_name ?? false,
        collect_email: body.collect_email ?? false,
        collect_phone: body.collect_phone ?? false,
        handoff_enabled: body.handoff_enabled ?? true,
      },
      include: {
        domains: { orderBy: { created_at: 'asc' } },
        knowledgeSources: { orderBy: { created_at: 'asc' } },
      },
    })

    return this.serializeAssistant(assistant, buildWidgetBaseUrl(req))
  }

  @Put(':id')
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: UpdateWebsiteAssistantDto, @Req() req: Request) {
    const tenantId = requireTenantId(user)
    await this.findTenantAssistantOrThrow(tenantId, id)

    const updateData: Record<string, unknown> = {}
    const fields = [
      'name',
      'status',
      'welcome_message',
      'theme_color',
      'text_color',
      'avatar_url',
      'position',
      'show_branding',
      'collect_name',
      'collect_email',
      'collect_phone',
      'handoff_enabled',
    ] as const

    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updateData[field] = (body as Record<string, unknown>)[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No assistant fields were provided')
    }

    const assistant = await this.prisma.websiteAssistant.update({
      where: { id },
      data: updateData,
      include: {
        domains: { orderBy: { created_at: 'asc' } },
        knowledgeSources: { orderBy: { created_at: 'asc' } },
      },
    })

    return this.serializeAssistant(assistant, buildWidgetBaseUrl(req))
  }

  @Post(':id/domains')
  async addDomain(@CurrentUser() user: any, @Param('id') id: string, @Body() body: AddDomainDto) {
    const tenantId = requireTenantId(user)
    await this.findTenantAssistantOrThrow(tenantId, id)
    const hostname = normalizeHostname(body.hostname)
    const existing = await this.prisma.websiteAssistantDomain.findFirst({
      where: {
        assistant_id: id,
        hostname,
      },
    })

    if (existing) {
      return existing
    }

    return this.prisma.websiteAssistantDomain.create({
      data: {
        assistant_id: id,
        hostname,
        verification_status: 'pending',
        verification_token: randomBytes(16).toString('hex'),
      },
    })
  }

  @Post(':id/domains/:domainId/verify')
  async verifyDomain(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('domainId') domainId: string,
    @Body() body: VerifyDomainDto,
  ) {
    const tenantId = requireTenantId(user)
    await this.findTenantAssistantOrThrow(tenantId, id)
    const domain = await this.prisma.websiteAssistantDomain.findFirst({
      where: {
        id: domainId,
        assistant_id: id,
      },
    })

    if (!domain) {
      throw new NotFoundException('Domain not found')
    }

    if (!body.token?.trim() || body.token !== domain.verification_token) {
      throw new BadRequestException('Verification token is invalid')
    }

    return this.prisma.websiteAssistantDomain.update({
      where: { id: domainId },
      data: {
        verification_status: 'verified',
        verified_at: new Date(),
      },
    })
  }

  @Get(':id/alerts/preferences')
  async getAlertPreferences(@CurrentUser() user: any, @Param('id') id: string) {
    const tenantId = requireTenantId(user)
    await this.findTenantAssistantOrThrow(tenantId, id)

    const preference = await this.prisma.websiteAssistantAlertPreference.findUnique({
      where: {
        assistant_id_user_id: {
          assistant_id: id,
          user_id: user.id,
        },
      },
    })

    return {
      notify_new_visitor: preference?.notify_new_visitor ?? true,
      notify_chat_started: preference?.notify_chat_started ?? true,
      notify_lead_captured: preference?.notify_lead_captured ?? true,
      notify_handoff_requested: preference?.notify_handoff_requested ?? true,
    }
  }

  @Put(':id/alerts/preferences')
  async updateAlertPreferences(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: UpdateAlertPreferencesDto,
  ) {
    const tenantId = requireTenantId(user)
    await this.findTenantAssistantOrThrow(tenantId, id)

    const updateData: Record<string, boolean> = {}
    const fields: Array<keyof UpdateAlertPreferencesDto> = [
      'notify_new_visitor',
      'notify_chat_started',
      'notify_lead_captured',
      'notify_handoff_requested',
    ]

    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updateData[field] = (body as Record<string, boolean>)[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No alert preferences were provided')
    }

    return this.prisma.websiteAssistantAlertPreference.upsert({
      where: {
        assistant_id_user_id: {
          assistant_id: id,
          user_id: user.id,
        },
      },
      create: {
        assistant_id: id,
        user_id: user.id,
        ...updateData,
      },
      update: updateData,
    })
  }

  @Post(':id/handoff/:sessionId')
  async requestHandoff(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Body() body: HandoffRequestDto,
  ) {
    const tenantId = requireTenantId(user)
    await this.findTenantAssistantOrThrow(tenantId, id)

    const session = await this.prisma.websiteVisitSession.findFirst({
      where: {
        id: sessionId,
        assistant_id: id,
        tenant_id: tenantId,
      },
    })

    if (!session) {
      throw new NotFoundException('Session not found')
    }

    await this.prisma.websiteEvent.create({
      data: {
        tenant_id: tenantId,
        assistant_id: id,
        visitor_id: session.visitor_id,
        session_id: session.id,
        event_type: 'handoff_request',
        event_value: body.message ?? null,
      },
    })

    await this.notificationService.send({
      tenantId,
      title: 'Website assistant handoff requested',
      body: `A handoff was requested for assistant ${id}.`,
      type: 'website_handoff_requested',
      data: {
        assistantId: id,
        sessionId: session.id,
        visitorId: session.visitor_id,
      },
    })

    await this.prisma.websiteVisitSession.update({
      where: { id: session.id },
      data: {
        handoff_requested: true,
      },
    })

    return { ok: true }
  }

  @Get(':id/analytics/summary')
  async getAnalyticsSummary(@CurrentUser() user: any, @Param('id') id: string) {
    const tenantId = requireTenantId(user)
    await this.findTenantAssistantOrThrow(tenantId, id)

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [
      totalVisitors,
      returningVisitors,
      totalSessions,
      totalEvents,
      chatsStarted,
      leadsCaptured,
      handoffRequests,
      recentSessions,
      topPaths,
    ] = await Promise.all([
      this.prisma.websiteVisitor.count({ where: { assistant_id: id } }),
      this.prisma.websiteVisitor.count({ where: { assistant_id: id, is_returning: true } }),
      this.prisma.websiteVisitSession.count({ where: { assistant_id: id } }),
      this.prisma.websiteEvent.count({ where: { assistant_id: id } }),
      this.prisma.websiteVisitSession.count({ where: { assistant_id: id, chat_started: true } }),
      this.prisma.websiteVisitSession.count({ where: { assistant_id: id, lead_captured: true } }),
      this.prisma.websiteVisitSession.count({ where: { assistant_id: id, handoff_requested: true } }),
      this.prisma.websiteVisitSession.findMany({
        where: { assistant_id: id, started_at: { gte: since } },
        select: { started_at: true },
        orderBy: { started_at: 'asc' },
      }),
      this.prisma.websiteEvent.groupBy({
        by: ['page_path'],
        where: { assistant_id: id, page_path: { not: null } },
        _count: { page_path: true },
        orderBy: { _count: { page_path: 'desc' } },
        take: 5,
      }),
    ])

    const sessionsByDay = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(since)
      day.setDate(since.getDate() + index)
      const key = day.toISOString().slice(0, 10)
      const count = recentSessions.filter((session) => session.started_at.toISOString().slice(0, 10) === key).length
      return { day: key, sessions: count }
    })

    return {
      totalVisitors,
      returningVisitors,
      totalSessions,
      totalEvents,
      chatsStarted,
      leadsCaptured,
      handoffRequests,
      topPaths: topPaths.map((entry) => ({ path: entry.page_path, count: entry._count.page_path })),
      sessionsByDay,
    }
  }

  @Get(':id/analytics/visitors')
  async getAnalyticsVisitors(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const tenantId = requireTenantId(user)
    await this.findTenantAssistantOrThrow(tenantId, id)
    const limit = parseLimit(req.query.limit as string | undefined, 25, 100)

    const visitors = await this.prisma.websiteVisitor.findMany({
      where: { assistant_id: id },
      include: {
        sessions: {
          select: {
            id: true,
            session_token: true,
            started_at: true,
            event_count: true,
            chat_started: true,
            lead_captured: true,
            handoff_requested: true,
          },
          orderBy: { started_at: 'desc' },
          take: 3,
        },
      },
      orderBy: { last_seen_at: 'desc' },
      take: limit,
    })

    return visitors.map((visitor) => ({
      id: visitor.id,
      visitor_fingerprint: visitor.visitor_fingerprint,
      first_seen_at: visitor.first_seen_at,
      last_seen_at: visitor.last_seen_at,
      visit_count: visitor.visit_count,
      is_returning: visitor.is_returning,
      country_code: visitor.country_code,
      country_name: visitor.country_name,
      region_name: visitor.region_name,
      city_name: visitor.city_name,
      first_referrer: visitor.first_referrer,
      first_landing_url: visitor.first_landing_url,
      last_landing_url: visitor.last_landing_url,
      recent_sessions: visitor.sessions,
    }))
  }

  @Get(':id/analytics/events')
  async getAnalyticsEvents(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const tenantId = requireTenantId(user)
    await this.findTenantAssistantOrThrow(tenantId, id)
    const limit = parseLimit(req.query.limit as string | undefined, 50, 200)

    return this.prisma.websiteEvent.findMany({
      where: { assistant_id: id },
      orderBy: { occurred_at: 'desc' },
      take: limit,
      select: {
        id: true,
        visitor_id: true,
        session_id: true,
        event_type: true,
        page_url: true,
        page_path: true,
        event_value: true,
        metadata: true,
        occurred_at: true,
      },
    })
  }

  private async findTenantAssistantOrThrow(tenantId: string, id: string) {
    const assistant = await this.prisma.websiteAssistant.findFirst({
      where: {
        id,
        tenant_id: tenantId,
      },
      include: {
        domains: { orderBy: { created_at: 'asc' } },
        knowledgeSources: { orderBy: { created_at: 'asc' } },
      },
    })

    if (!assistant) {
      throw new NotFoundException('Website assistant not found')
    }

    return assistant
  }

  private serializeAssistant(assistant: any, widgetBaseUrl: string) {
    const scriptUrl = `${widgetBaseUrl}/widget/embed/${assistant.public_embed_key}/script.js`
    return {
      ...assistant,
      embed_script_url: scriptUrl,
      embed_code: `<script async src="${scriptUrl}"></script>`,
    }
  }
}