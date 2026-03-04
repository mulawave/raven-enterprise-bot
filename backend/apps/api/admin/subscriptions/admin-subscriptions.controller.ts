import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../../libs/auth/guards/super-admin.guard'
import { PLANS, PlanTier, SubscriptionPlan, SubscriptionsService } from '../../../../libs/billing/subscriptions.service'

interface AssignPlanDto {
  planTier: PlanTier
}

@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminSubscriptionsController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * GET /admin/subscriptions/plans
   * List all available subscription plans
   */
  @Get('plans')
  async getPlans() {
    const plans = Object.values(PLANS) as SubscriptionPlan[]

    return {
      plans: plans.map((plan) => ({
        tier: plan.tier,
        name: plan.name,
        price_kobo: plan.priceKobo,
        price_formatted: `₦${(plan.priceKobo / 100).toLocaleString()}`,
        conversations_limit: plan.conversationsLimit,
        overage_price_kobo: plan.overagePriceKobo,
        overage_price_formatted: `₦${(plan.overagePriceKobo / 100).toLocaleString()}`,
      })),
    }
  }

  /**
   * GET /admin/subscriptions
   * List all subscriptions across all tenants
   */
  @Get()
  async listSubscriptions(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '50',
    @Query('status') status?: string,
  ) {
    const pageNum = parseInt(page, 10)
    const pageSizeNum = parseInt(pageSize, 10)
    const skip = (pageNum - 1) * pageSizeNum

    const where = status ? { status } : {}

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: pageSizeNum,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              created_at: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.subscription.count({ where }),
    ])

    return {
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        tenant: s.tenant,
        plan_tier: s.plan_tier,
        status: s.status,
        conversations_used: s.conversations_used,
        conversations_limit: s.conversations_limit,
        usage_percent: Math.round((s.conversations_used / s.conversations_limit) * 100),
        overage_cost_kobo: s.overage_cost_kobo,
        current_period_start: s.current_period_start,
        current_period_end: s.current_period_end,
        created_at: s.created_at,
      })),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    }
  }

  /**
   * PATCH /admin/subscriptions/tenants/:tenantId/plan
   * Force assign a plan to any tenant
   */
  @Patch('tenants/:tenantId/plan')
  async assignPlan(@Param('tenantId') tenantId: string, @Body() body: AssignPlanDto) {
    const { planTier } = body

    if (!planTier || !['starter', 'growth', 'enterprise'].includes(planTier)) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'planTier must be "starter", "growth", or "enterprise"',
        },
      }
    }

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Tenant not found',
        },
      }
    }

    // Check if subscription exists
    const existing = await this.prisma.subscription.findUnique({
      where: { tenant_id: tenantId },
    })

    if (existing) {
      // Change existing plan
      await this.subscriptionsService.changePlan(tenantId, planTier)
    } else {
      // Create new subscription
      await this.subscriptionsService.createSubscription(tenantId, planTier)
    }

    // Log audit trail
    await this.prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        entity_id: tenantId,
        action: `ADMIN_PLAN_ASSIGNED:${planTier}`,
        timestamp: new Date(),
      },
    })

    const updated = await this.prisma.subscription.findUnique({
      where: { tenant_id: tenantId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return {
      success: true,
      subscription: updated,
    }
  }

  /**
   * GET /admin/subscriptions/tenants/:tenantId
   * Get subscription for a specific tenant
   */
  @Get('tenants/:tenantId')
  async getTenantSubscription(@Param('tenantId') tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenant_id: tenantId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            created_at: true,
          },
        },
      },
    })

    if (!subscription) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Subscription not found for this tenant',
        },
      }
    }

    return subscription
  }
}
