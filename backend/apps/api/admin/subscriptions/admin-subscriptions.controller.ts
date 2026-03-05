import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, BadRequestException, NotFoundException, HttpCode,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../../libs/auth/guards/super-admin.guard'
import { PlanTier, SubscriptionsService } from '../../../../libs/billing/subscriptions.service'

interface AssignPlanDto {
  planTier: PlanTier
}

interface UpsertPlanDto {
  name?: string
  description?: string
  price_kobo?: number
  conversations_limit?: number
  overage_price_kobo?: number
  features?: string[]
  is_active?: boolean
  sort_order?: number
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
   * List all subscription plans from the database
   */
  @Get('plans')
  async getPlans() {
    const rows = await this.prisma.plan.findMany({
      orderBy: { sort_order: 'asc' },
    })

    return {
      plans: rows.map((p) => ({
        tier: p.tier,
        name: p.name,
        description: p.description,
        price_kobo: p.price_kobo,
        price_formatted: `₦${(p.price_kobo / 100).toLocaleString()}`,
        conversations_limit: p.conversations_limit,
        overage_price_kobo: p.overage_price_kobo,
        overage_price_formatted: `₦${(p.overage_price_kobo / 100).toLocaleString()}`,
        features: (() => { try { return JSON.parse(p.features as string) } catch { return [] } })(),
        is_active: p.is_active,
        sort_order: p.sort_order,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
    }
  }

  /**
   * GET /admin/subscriptions/plans/:tier
   * Get a single plan by tier
   */
  @Get('plans/:tier')
  async getPlan(@Param('tier') tier: string) {
    const plan = await this.prisma.plan.findUnique({ where: { tier } })
    if (!plan) throw new NotFoundException(`Plan "${tier}" not found`)

    return {
      tier: plan.tier,
      name: plan.name,
      description: plan.description,
      price_kobo: plan.price_kobo,
      price_formatted: `₦${(plan.price_kobo / 100).toLocaleString()}`,
      conversations_limit: plan.conversations_limit,
      overage_price_kobo: plan.overage_price_kobo,
      overage_price_formatted: `₦${(plan.overage_price_kobo / 100).toLocaleString()}`,
      features: (() => { try { return JSON.parse(plan.features as string) } catch { return [] } })(),
      is_active: plan.is_active,
      sort_order: plan.sort_order,
    }
  }

  /**
   * POST /admin/subscriptions/plans
   * Create a new subscription plan
   */
  @Post('plans')
  async createPlan(@Body() body: UpsertPlanDto & { tier: string }) {
    const { tier, name, description, price_kobo, conversations_limit, overage_price_kobo, features, is_active, sort_order } = body

    if (!tier || !name) throw new BadRequestException('tier and name are required')
    if (price_kobo == null || conversations_limit == null || overage_price_kobo == null) {
      throw new BadRequestException('price_kobo, conversations_limit and overage_price_kobo are required')
    }

    const exists = await this.prisma.plan.findUnique({ where: { tier } })
    if (exists) throw new BadRequestException(`Plan with tier "${tier}" already exists`)

    const plan = await this.prisma.plan.create({
      data: {
        tier,
        name,
        description: description ?? null,
        price_kobo,
        conversations_limit,
        overage_price_kobo,
        features: JSON.stringify(features ?? []),
        is_active: is_active ?? true,
        sort_order: sort_order ?? 99,
      },
    })

    return { success: true, plan }
  }

  /**
   * PATCH /admin/subscriptions/plans/:tier
   * Update a subscription plan's fields
   */
  @Patch('plans/:tier')
  async updatePlan(@Param('tier') tier: string, @Body() body: UpsertPlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { tier } })
    if (!plan) throw new NotFoundException(`Plan "${tier}" not found`)

    const EDITABLE = ['name', 'description', 'price_kobo', 'conversations_limit', 'overage_price_kobo', 'is_active', 'sort_order'] as const
    const data: Record<string, unknown> = {}

    for (const field of EDITABLE) {
      if (field in body) data[field] = (body as Record<string, unknown>)[field] ?? null
    }
    if (body.features !== undefined) {
      data['features'] = JSON.stringify(Array.isArray(body.features) ? body.features : [])
    }

    if (Object.keys(data).length === 0) throw new BadRequestException('No valid fields provided')

    const updated = await this.prisma.plan.update({ where: { tier }, data })

    return {
      success: true,
      plan: {
        ...updated,
        features: (() => { try { return JSON.parse(updated.features as string) } catch { return [] } })(),
        price_formatted: `₦${(updated.price_kobo / 100).toLocaleString()}`,
        overage_price_formatted: `₦${(updated.overage_price_kobo / 100).toLocaleString()}`,
      },
    }
  }

  /**
   * DELETE /admin/subscriptions/plans/:tier
   * Soft-delete a plan (sets is_active = false)
   */
  @Delete('plans/:tier')
  @HttpCode(200)
  async deletePlan(@Param('tier') tier: string) {
    const plan = await this.prisma.plan.findUnique({ where: { tier } })
    if (!plan) throw new NotFoundException(`Plan "${tier}" not found`)

    await this.prisma.plan.update({ where: { tier }, data: { is_active: false } })

    return { success: true, message: `Plan "${tier}" deactivated` }
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

    if (!planTier) {
      return { error: { code: 'VALIDATION_ERROR', message: 'planTier is required' } }
    }

    // Validate against DB plans
    const planExists = await this.prisma.plan.findUnique({ where: { tier: planTier } })
    if (!planExists || !planExists.is_active) {
      return { error: { code: 'VALIDATION_ERROR', message: `Plan "${planTier}" does not exist or is inactive` } }
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
