import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaClient, UserScope } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../libs/auth/guards/super-admin.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'
import { NotificationService } from '../../../libs/notifications/notification.service'
import { EmailService } from '../../../libs/email/email.service'

@Controller()
export class NotificationController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  // ── Token registration ──────────────────────────────────────────────────

  /**
   * POST /api/notifications/token
   * Register a device FCM token for the current logged-in tenant user.
   */
  @Post('api/notifications/token')
  @UseGuards(JwtAuthGuard)
  async registerToken(@CurrentUser() user: any, @Body() body: { token: string; platform?: string }) {
    if (!body?.token?.trim()) throw new BadRequestException('token is required')
    await this.notificationService.registerToken(body.token, {
      userId: user.id,
      tenantId: user.tenant_id ?? undefined,
      platform: body.platform ?? 'web',
    })
    return { ok: true }
  }

  /**
   * DELETE /api/notifications/token
   * Remove a device token on logout.
   */
  @Delete('api/notifications/token')
  @UseGuards(JwtAuthGuard)
  async unregisterToken(@CurrentUser() user: any, @Body() body: { token: string }) {
    if (!body?.token?.trim()) throw new BadRequestException('token is required')

    // Ensure this token belongs to the requesting user
    const row = await this.prisma.fcmToken.findUnique({ where: { token: body.token } })
    if (row && row.user_id !== user.id) throw new ForbiddenException()

    await this.notificationService.unregisterToken(body.token)
    return { ok: true }
  }

  // ── In-app notifications ────────────────────────────────────────────────

  /**
   * GET /api/notifications
   * List the user's AppNotification rows — unread first, paginated.
   */
  @Get('api/notifications')
  @UseGuards(JwtAuthGuard)
  async listNotifications(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    const take = Math.min(parseInt(limit, 10) || 30, 100)
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.appNotification.findMany({
        where: { user_id: user.id },
        orderBy: [{ read: 'asc' }, { created_at: 'desc' }],
        take,
        skip,
      }),
      this.prisma.appNotification.count({ where: { user_id: user.id } }),
      this.prisma.appNotification.count({ where: { user_id: user.id, read: false } }),
    ])

    return { items, total, unreadCount, page: parseInt(page, 10) || 1, limit: take }
  }

  /**
   * PATCH /api/notifications/read-all
   * Mark all notifications as read.
   */
  @Patch('api/notifications/read-all')
  @UseGuards(JwtAuthGuard)
  async markAllRead(@CurrentUser() user: any) {
    await this.prisma.appNotification.updateMany({
      where: { user_id: user.id, read: false },
      data: { read: true },
    })
    return { ok: true }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Mark a single notification as read.
   */
  @Patch('api/notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  async markOneRead(@CurrentUser() user: any, @Param('id') id: string) {
    const row = await this.prisma.appNotification.findUnique({ where: { id } })
    if (!row) throw new NotFoundException()
    if (row.user_id !== user.id) throw new ForbiddenException()
    await this.prisma.appNotification.update({ where: { id }, data: { read: true } })
    return { ok: true }
  }

  // ── Admin broadcast ─────────────────────────────────────────────────────

  /**
   * POST /admin/notifications/broadcast
   * Send push + optional email to a segment of tenants.
   * Body: { title, body, type?, segment: 'all'|'plan:<plan>', tenantIds?: string[], sendEmail?, emailSubject?, emailHtml? }
   */
  @Post('admin/notifications/broadcast')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async broadcast(
    @CurrentUser() admin: any,
    @Body()
    body: {
      title: string
      body: string
      type?: string
      segment: 'all' | string
      tenantIds?: string[]
      sendEmail?: boolean
      emailSubject?: string
      emailHtml?: string
    },
  ) {
    if (admin.scope !== UserScope.SYSTEM) throw new ForbiddenException()
    if (!body?.title?.trim() || !body?.body?.trim()) {
      throw new BadRequestException('title and body are required')
    }

    // 1. Resolve tenants by segment
    let tenantFilter: any = {}
    if (body.segment === 'all') {
      tenantFilter = {}
    } else if (body.segment?.startsWith('plan:')) {
      const plan = body.segment.replace('plan:', '')
      tenantFilter = { subscription: { plan_tier: plan } }
    } else if (body.tenantIds?.length) {
      tenantFilter = { id: { in: body.tenantIds } }
    }

    const tenants = await this.prisma.tenant.findMany({
      where: { ...tenantFilter, suspended: false },
      select: { id: true },
    })
    const tenantIds = tenants.map((t) => t.id)
    if (!tenantIds.length) return { ok: true, sent: 0 }

    // 2. Collect all users for these tenants
    const users = await this.prisma.user.findMany({
      where: { tenant_id: { in: tenantIds } },
      select: { id: true, email: true, tenant_id: true },
    })

    // 3. Persist AppNotification for each user
    await this.prisma.appNotification.createMany({
      data: users.map((u) => ({
        user_id: u.id,
        tenant_id: u.tenant_id,
        title: body.title,
        body: body.body,
        type: (body.type as any) ?? 'broadcast',
        data: null,
      })),
    })

    // 4. Send FCM push to all their tokens
    const tokenRows = await this.prisma.fcmToken.findMany({
      where: { user_id: { in: users.map((u) => u.id) } },
      select: { token: true },
    })
    if (tokenRows.length) {
      await this.notificationService.sendToTokens(
        tokenRows.map((t) => t.token),
        { title: body.title, body: body.body, type: body.type ?? 'broadcast' },
      )
    }

    // 5. Optional email newsletter
    let emailsSent = 0
    if (body.sendEmail && body.emailSubject && body.emailHtml) {
      for (const u of users) {
        if (!u.email) continue
        try {
          await this.emailService.send({
            to: u.email,
            subject: body.emailSubject,
            html: body.emailHtml,
          })
          emailsSent++
        } catch {
          // best-effort — don't abort on individual failures
        }
      }
    }

    return { ok: true, tenants: tenantIds.length, pushTokens: tokenRows.length, emailsSent }
  }

  // ── Admin token registration ────────────────────────────────────────────

  /**
   * POST /admin/notifications/token
   * Register an admin-side FCM token (for new_tenant, alert notifications).
   */
  @Post('admin/notifications/token')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async adminRegisterToken(
    @CurrentUser() admin: any,
    @Body() body: { token: string; platform?: string },
  ) {
    if (!body?.token?.trim()) throw new BadRequestException('token is required')
    await this.notificationService.registerToken(body.token, {
      userId: admin.id,
      platform: body.platform ?? 'web',
    })
    return { ok: true }
  }

  /**
   * GET /admin/notifications
   * List admin user's AppNotification rows.
   */
  @Get('admin/notifications')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async adminListNotifications(
    @CurrentUser() admin: any,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    const take = Math.min(parseInt(limit, 10) || 30, 100)
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.appNotification.findMany({
        where: { user_id: admin.id },
        orderBy: [{ read: 'asc' }, { created_at: 'desc' }],
        take,
        skip,
      }),
      this.prisma.appNotification.count({ where: { user_id: admin.id } }),
      this.prisma.appNotification.count({ where: { user_id: admin.id, read: false } }),
    ])

    return { items, total, unreadCount }
  }

  /**
   * PATCH /admin/notifications/read-all
   */
  @Patch('admin/notifications/read-all')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async adminMarkAllRead(@CurrentUser() admin: any) {
    await this.prisma.appNotification.updateMany({
      where: { user_id: admin.id, read: false },
      data: { read: true },
    })
    return { ok: true }
  }

  /**
   * GET /admin/notifications/broadcasts
   * List past broadcast notifications (grouped by broadcast title).
   */
  @Get('admin/notifications/broadcasts')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async listBroadcasts(
    @CurrentUser() admin: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    if (admin.scope !== UserScope.SYSTEM) throw new ForbiddenException()
    const take = Math.min(parseInt(limit, 10) || 20, 100)
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take

    // Get distinct broadcast notifications by grouping by (title, created_at day)
    const rows = await (this.prisma as any).$queryRaw`
      SELECT
        title,
        body,
        type,
        DATE_TRUNC('hour', created_at) AS sent_at,
        COUNT(*) AS recipient_count
      FROM "AppNotification"
      WHERE type = 'broadcast'
      GROUP BY title, body, type, DATE_TRUNC('hour', created_at)
      ORDER BY DATE_TRUNC('hour', created_at) DESC
      LIMIT ${take} OFFSET ${skip}
    `

    return { items: rows }
  }
}
