import { Controller, Get, Post, Put, Delete, Body, HttpCode, HttpStatus, UnauthorizedException, UseGuards } from '@nestjs/common'
import { SubscriptionsService, PlanTier } from '../../../libs/billing/subscriptions.service'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { SystemScopeGuard } from '../../../libs/auth/guards/system-scope.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'

@Controller('api/subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Get subscription details for a tenant
   * GET /api/subscriptions?tenantId=xxx
   */
  @Get()
  async getSubscription(@CurrentUser() user: any) {
    const tenantId = user?.tenant_id
    if (!tenantId) {
      throw new UnauthorizedException('Tenant credentials required')
    }

    const subscription = await this.subscriptionsService.getSubscription(tenantId)
    if (!subscription) {
      return { error: { code: 'NOT_FOUND', message: 'Subscription not found' } }
    }

    return subscription
  }

  /**
   * Get usage statistics for dashboard
   * GET /api/subscriptions/usage?tenantId=xxx
   */
  @Get('usage')
  async getUsageStats(@CurrentUser() user: any) {
    const tenantId = user?.tenant_id
    if (!tenantId) {
      throw new UnauthorizedException('Tenant credentials required')
    }

    const stats = await this.subscriptionsService.getUsageStats(tenantId)
    if (!stats) {
      return { error: { code: 'NOT_FOUND', message: 'Subscription not found' } }
    }

    return stats
  }

  /**
   * Calculate current bill (base + overages)
   * GET /api/subscriptions/bill?tenantId=xxx
   */
  @Get('bill')
  async calculateBill(@CurrentUser() user: any) {
    const tenantId = user?.tenant_id
    if (!tenantId) {
      throw new UnauthorizedException('Tenant credentials required')
    }

    try {
      const bill = await this.subscriptionsService.calculateBill(tenantId)
      return bill
    } catch (error) {
      return { error: { code: 'NOT_FOUND', message: (error as Error).message } }
    }
  }

  /**
   * Create a new subscription
   * POST /api/subscriptions
   * Body: { tenantId: string, planTier: 'starter' | 'growth' | 'enterprise' }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(@CurrentUser() user: any, @Body() body: { planTier: PlanTier }) {
    const tenantId = user?.tenant_id
    const { planTier } = body

    if (!tenantId || !planTier) {
      throw new UnauthorizedException('Tenant credentials required')
    }

    if (!['starter', 'growth', 'enterprise'].includes(planTier)) {
      return { error: { code: 'VALIDATION_ERROR', message: 'planTier must be starter, growth, or enterprise' } }
    }

    try {
      const subscription = await this.subscriptionsService.createSubscription(tenantId, planTier)
      return subscription
    } catch (error) {
      return { error: { code: 'CONFLICT', message: 'Subscription already exists for this tenant' } }
    }
  }

  /**
   * Change subscription plan — ADMIN ONLY
   * PUT /api/subscriptions/plan
   * Requires SYSTEM scope JWT (admin-console). Tenants must pay via the
   * POST /api/subscription/payment/initialize → Paystack flow instead.
   */
  @Put('plan')
  @UseGuards(SystemScopeGuard)
  async changePlan(@CurrentUser() user: any, @Body() body: { newPlanTier: PlanTier }) {
    const tenantId = user?.tenant_id
    const { newPlanTier } = body

    if (!tenantId || !newPlanTier) {
      throw new UnauthorizedException('Tenant credentials required')
    }

    if (!['starter', 'growth', 'enterprise'].includes(newPlanTier)) {
      return { error: { code: 'VALIDATION_ERROR', message: 'newPlanTier must be starter, growth, or enterprise' } }
    }

    try {
      const result = await this.subscriptionsService.changePlan(tenantId, newPlanTier)
      return result
    } catch (error) {
      return { error: { code: 'NOT_FOUND', message: (error as Error).message } }
    }
  }

  /**
   * Cancel subscription
   * DELETE /api/subscriptions?tenantId=xxx
   */
  @Delete()
  async cancelSubscription(@CurrentUser() user: any) {
    const tenantId = user?.tenant_id
    if (!tenantId) {
      throw new UnauthorizedException('Tenant credentials required')
    }

    try {
      const result = await this.subscriptionsService.cancelSubscription(tenantId)
      return result
    } catch (error) {
      return { error: { code: 'NOT_FOUND', message: (error as Error).message } }
    }
  }
}
