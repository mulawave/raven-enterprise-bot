import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../../libs/auth/guards/super-admin.guard'

@Controller('admin/billing')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminBillingController {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * GET /admin/billing/payments
   * List all payments across all tenants
   */
  @Get('payments')
  async listPayments(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '50',
    @Query('status') status?: string,
  ) {
    const pageNum = parseInt(page, 10)
    const pageSizeNum = parseInt(pageSize, 10)
    const skip = (pageNum - 1) * pageSizeNum

    const where = status ? { status } : {}

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: pageSizeNum,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
          order: {
            select: {
              id: true,
              customer_id: true,
            },
          },
          booking: {
            select: {
              id: true,
              customer_id: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ])

    return {
      payments: payments.map((p) => ({
        id: p.id,
        tenant: p.tenant,
        amount_kobo: p.amount_kobo,
        amount_formatted: `₦${(p.amount_kobo / 100).toLocaleString()}`,
        status: p.status,
        reference: p.reference,
        provider: p.provider,
        order_id: p.order_id,
        booking_id: p.booking_id,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    }
  }

  /**
   * GET /admin/billing/tenants/:tenantId/payments
   * Get payments for a specific tenant
   */
  @Get('tenants/:tenantId/payments')
  async getTenantPayments(
    @Param('tenantId') tenantId: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ) {
    const pageNum = parseInt(page, 10)
    const pageSizeNum = parseInt(pageSize, 10)
    const skip = (pageNum - 1) * pageSizeNum

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenant_id: tenantId },
        skip,
        take: pageSizeNum,
        include: {
          order: {
            select: {
              id: true,
              total_kobo: true,
            },
          },
          booking: {
            select: {
              id: true,
              total_kobo: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.payment.count({ where: { tenant_id: tenantId } }),
    ])

    return {
      payments,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    }
  }

  /**
   * GET /admin/billing/revenue/summary
   * Get revenue metrics (MRR, ARR, etc.)
   */
  @Get('revenue/summary')
  async getRevenueSummary() {
    // Get all active subscriptions
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: { status: 'active' },
      select: {
        plan_tier: true,
      },
    })

    // Calculate MRR from subscription plans
    const PLAN_PRICES = {
      starter: 4900000, // ₦49,000
      growth: 19900000, // ₦199,000
      enterprise: 79900000, // ₦799,000
    }

    let mrr = 0
    activeSubscriptions.forEach((sub) => {
      const planPrice = PLAN_PRICES[sub.plan_tier as keyof typeof PLAN_PRICES] || 0
      mrr += planPrice
    })

    const arr = mrr * 12

    // Get payment volume (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentPayments = await this.prisma.payment.aggregate({
      where: {
        status: 'paid',
        created_at: { gte: thirtyDaysAgo },
      },
      _sum: {
        amount_kobo: true,
      },
      _count: true,
    })

    // Get total paid payments ever
    const totalRevenue = await this.prisma.payment.aggregate({
      where: { status: 'paid' },
      _sum: {
        amount_kobo: true,
      },
    })

    // Calculate average revenue per tenant
    const tenantCount = await this.prisma.tenant.count()
    const averageRevenuePerTenant = tenantCount > 0 ? mrr / tenantCount : 0

    return {
      mrr,
      mrr_formatted: `₦${(mrr / 100).toLocaleString()}`,
      arr,
      arr_formatted: `₦${(arr / 100).toLocaleString()}`,
      active_subscriptions: activeSubscriptions.length,
      payment_volume_30d: recentPayments._sum.amount_kobo || 0,
      payment_volume_30d_formatted: `₦${((recentPayments._sum.amount_kobo || 0) / 100).toLocaleString()}`,
      payment_count_30d: recentPayments._count,
      total_revenue_all_time: totalRevenue._sum.amount_kobo || 0,
      total_revenue_all_time_formatted: `₦${((totalRevenue._sum.amount_kobo || 0) / 100).toLocaleString()}`,
      average_revenue_per_tenant: Math.round(averageRevenuePerTenant),
      average_revenue_per_tenant_formatted: `₦${Math.round(averageRevenuePerTenant / 100).toLocaleString()}`,
      total_tenants: tenantCount,
      period: {
        start: thirtyDaysAgo.toISOString(),
        end: new Date().toISOString(),
      },
    }
  }
}
