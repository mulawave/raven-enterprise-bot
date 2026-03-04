import { Controller, Get, Post, Put, Delete, Body, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { SubscriptionsService, PlanTier } from '../../../libs/billing/subscriptions.service'

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Get subscription details for a tenant
   * GET /api/subscriptions?tenantId=xxx
   */
  @Get()
  async getSubscription(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      return { error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } }
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
  async getUsageStats(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      return { error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } }
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
  async calculateBill(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      return { error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } }
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
  async createSubscription(@Body() body: { tenantId: string; planTier: PlanTier }) {
    const { tenantId, planTier } = body

    if (!tenantId || !planTier) {
      return { error: { code: 'VALIDATION_ERROR', message: 'tenantId and planTier are required' } }
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
   * Change subscription plan
   * PUT /api/subscriptions/plan
   * Body: { tenantId: string, newPlanTier: 'starter' | 'growth' | 'enterprise' }
   */
  @Put('plan')
  async changePlan(@Body() body: { tenantId: string; newPlanTier: PlanTier }) {
    const { tenantId, newPlanTier } = body

    if (!tenantId || !newPlanTier) {
      return { error: { code: 'VALIDATION_ERROR', message: 'tenantId and newPlanTier are required' } }
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
  async cancelSubscription(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      return { error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } }
    }

    try {
      const result = await this.subscriptionsService.cancelSubscription(tenantId)
      return result
    } catch (error) {
      return { error: { code: 'NOT_FOUND', message: (error as Error).message } }
    }
  }
}
