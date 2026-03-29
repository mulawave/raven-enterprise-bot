import {
  Controller, Get, Post, Body, Query, UseGuards,
  ForbiddenException, BadRequestException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'

// ─── Tenant Data Controller ─────────────────────────────────────────────────
// Provides tenant-scoped endpoints for the dashboard:
//   GET  /api/analytics/summary
//   GET  /api/customers
//   GET  /api/payments
//   POST /api/broadcast/send
// ────────────────────────────────────────────────────────────────────────────

function requireTenant(user: any): string {
  if (!user?.tenant_id || user.scope === 'SYSTEM') {
    throw new ForbiddenException('Tenant credentials required')
  }
  return user.tenant_id as string
}

// ─── Analytics ───────────────────────────────────────────────────────────────

@Controller('api/analytics')
@UseGuards(JwtAuthGuard)
export class TenantAnalyticsController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get('summary')
  async summary(@CurrentUser() user: any) {
    const tenantId = requireTenant(user)
    const [orders, bookings, customers, conversations, contacts, payments] = await Promise.all([
      this.prisma.order.count({ where: { tenant_id: tenantId } }),
      this.prisma.booking.count({ where: { tenant_id: tenantId } }),
      this.prisma.customer.count({ where: { tenant_id: tenantId } }),
      this.prisma.conversation.count({ where: { tenant_id: tenantId } }),
      this.prisma.contact.count({ where: { tenant_id: tenantId } }),
      this.prisma.payment.count({ where: { tenant_id: tenantId, status: 'success' } }),
    ])
    return { orders, bookings, customers, conversations, contacts, payments }
  }
}

// ─── Customers (ordering system customers) ──────────────────────────────────

@Controller('api/customers')
@UseGuards(JwtAuthGuard)
export class TenantCustomersController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  async list(@CurrentUser() user: any, @Query('search') search?: string) {
    const tenantId = requireTenant(user)
    const where: Record<string, unknown> = { tenant_id: tenantId }
    if (search?.trim()) {
      where.OR = [
        { name:  { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim() } },
      ]
    }
    return this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        created_at: true,
        _count: { select: { orders: true, bookings: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    })
  }
}

// ─── Payments ────────────────────────────────────────────────────────────────

@Controller('api/payments/list')
@UseGuards(JwtAuthGuard)
export class TenantPaymentsController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  async list(@CurrentUser() user: any) {
    const tenantId = requireTenant(user)
    const rows = await this.prisma.payment.findMany({
      where: { tenant_id: tenantId },
      include: {
        order:   { select: { id: true, status: true, customer: { select: { name: true, phone: true } } } },
        booking: { select: { id: true, customer: { select: { name: true, phone: true } } } },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    })

    return rows.map(p => ({
      id:           p.id,
      orderId:      p.order_id,
      bookingId:    p.booking_id,
      amount:       p.amount_kobo,
      status:       p.status,
      provider:     p.provider ?? 'paystack',
      reference:    p.reference,
      createdAt:    p.created_at,
      customerName: p.order?.customer?.name ?? p.booking?.customer?.name ?? null,
      customerPhone: p.order?.customer?.phone ?? p.booking?.customer?.phone ?? null,
      orderStatus:  p.order?.status ?? null,
    }))
  }
}

// ─── Broadcast ───────────────────────────────────────────────────────────────

@Controller('api/broadcast')
@UseGuards(JwtAuthGuard)
export class TenantBroadcastController {
  constructor(private readonly prisma: PrismaClient) {}

  @Post('send')
  async send(
    @CurrentUser() user: any,
    @Body() body: { message?: string; channel?: string },
  ) {
    const tenantId = requireTenant(user)
    const content = body.message?.trim()
    if (!content) throw new BadRequestException('message is required')

    const channel = (body.channel ?? 'whatsapp') as 'whatsapp'

    if (channel !== 'whatsapp') {
      throw new BadRequestException('Only whatsapp channel is supported at this time')
    }

    // Load tenant credentials
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId },
      select: { theme: true },
    })
    if (!tenant) throw new ForbiddenException('Tenant not found')

    let theme: Record<string, string> = {}
    try { theme = JSON.parse(tenant.theme ?? '{}') } catch { /* ignore malformed JSON */ }

    const accessToken   = theme['META_ACCESS_TOKEN']
    const phoneNumberId = theme['META_PHONE_NUMBER_ID']

    if (!accessToken || !phoneNumberId) {
      throw new BadRequestException('WhatsApp credentials not configured. Go to Settings > WhatsApp & AI to set them up.')
    }

    // Fetch contacts with phone numbers
    const contacts = await this.prisma.contact.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, phone: true },
    })

    if (contacts.length === 0) {
      return { sent: 0, failed: 0, message: 'No contacts with phone numbers found.' }
    }

    let sent = 0
    let failed = 0

    for (const contact of contacts) {
      const phone = contact.phone!.replace(/\D/g, '') // strip non-digits
      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'text',
              text: { body: content },
            }),
          },
        )
        if (response.ok) { sent++ } else { failed++ }
      } catch {
        failed++
      }
    }

    return { sent, failed, total: contacts.length }
  }
}
