import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

export interface TrialStatus {
  isTrialActive: boolean
  trialStartedAt: Date | null
  trialEndsAt: Date | null
  daysRemaining: number
  hasExpired: boolean
  trialConvertedAt: Date | null
}

@Injectable()
export class TrialService {
  private readonly logger = new Logger(TrialService.name)
  private readonly TRIAL_DURATION_DAYS = 7

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Start a 7-day trial for a tenant
   * Can only be called when subscription status is not yet active
   */
  async startTrial(tenantId: string, planTier: string = 'promo'): Promise<{ trialStartedAt: Date; trialEndsAt: Date }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenant_id: tenantId },
    })

    if (!subscription) {
      throw new BadRequestException('Subscription not found')
    }

    // Trial can only be started for new subscriptions or those not already in trial
    if (subscription.trial_started_at !== null && subscription.status !== 'cancelled') {
      throw new BadRequestException('Trial already started for this subscription')
    }

    // Cannot start trial if already active
    if (subscription.status === 'active' && subscription.trial_converted_at === null) {
      throw new BadRequestException('Cannot start trial on an already active subscription')
    }

    const now = new Date()
    const trialEndsAt = new Date(now.getTime() + this.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000)

    const updated = await this.prisma.subscription.update({
      where: { tenant_id: tenantId },
      data: {
        plan_tier: planTier,
        status: 'trial',
        trial_started_at: now,
        trial_ends_at: trialEndsAt,
        current_period_start: now,
        current_period_end: trialEndsAt,
        conversations_limit: 200,
        conversations_used: 0,
      },
    })

    this.logger.log(`Trial started for tenant ${tenantId}, ends at ${trialEndsAt}`)

    return {
      trialStartedAt: updated.trial_started_at!,
      trialEndsAt: updated.trial_ends_at!,
    }
  }

  /**
   * Get current trial status for a tenant
   */
  async getTrialStatus(tenantId: string): Promise<TrialStatus> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenant_id: tenantId },
    })

    if (!subscription) {
      throw new BadRequestException('Subscription not found')
    }

    const isTrialActive = subscription.status === 'trial'
    const hasExpired = subscription.trial_ends_at ? new Date() > subscription.trial_ends_at : false
    const daysRemaining = this.calculateDaysRemaining(subscription.trial_ends_at)

    return {
      isTrialActive,
      trialStartedAt: subscription.trial_started_at,
      trialEndsAt: subscription.trial_ends_at,
      daysRemaining: Math.max(0, daysRemaining),
      hasExpired,
      trialConvertedAt: subscription.trial_converted_at,
    }
  }

  /**
   * Convert a trial subscription to a paid subscription
   * Moves the subscription from trial status to active status
   */
  async convertTrial(tenantId: string, targetPlanTier: string): Promise<{ status: string; planTier: string; convertedAt: Date }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenant_id: tenantId },
    })

    if (!subscription) {
      throw new BadRequestException('Subscription not found')
    }

    // Must be in trial status to convert
    if (subscription.status !== 'trial') {
      throw new BadRequestException('Subscription is not in trial status')
    }

    // Trial must not have expired
    if (subscription.trial_ends_at && new Date() > subscription.trial_ends_at) {
      throw new BadRequestException('Trial period has expired. Please start a new subscription.')
    }

    const now = new Date()

    // Update subscription to active status with new plan
    const updated = await this.prisma.subscription.update({
      where: { tenant_id: tenantId },
      data: {
        status: 'active',
        plan_tier: targetPlanTier,
        trial_converted_at: now,
        current_period_start: now,
        conversations_used: 0,
      },
    })

    this.logger.log(`Trial converted for tenant ${tenantId} to plan ${targetPlanTier}`)

    return {
      status: updated.status,
      planTier: updated.plan_tier,
      convertedAt: updated.trial_converted_at!,
    }
  }

  /**
   * Check if a trial has expired and mark subscription appropriately
   */
  async checkAndHandleExpiredTrial(tenantId: string): Promise<{ isExpired: boolean; requiresAction: boolean }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenant_id: tenantId },
    })

    if (!subscription || subscription.status !== 'trial') {
      return { isExpired: false, requiresAction: false }
    }

    const isExpired = subscription.trial_ends_at ? new Date() > subscription.trial_ends_at : false

    if (isExpired) {
      // Mark subscription as past_due when trial expires
      await this.prisma.subscription.update({
        where: { tenant_id: tenantId },
        data: {
          status: 'past_due',
        },
      })

      this.logger.warn(`Trial expired for tenant ${tenantId}, marked as past_due`)
      return { isExpired: true, requiresAction: true }
    }

    return { isExpired: false, requiresAction: false }
  }

  /**
   * Calculate days remaining in trial
   */
  private calculateDaysRemaining(trialEndsAt: Date | null): number {
    if (!trialEndsAt) return 0

    const now = new Date()
    const msRemaining = trialEndsAt.getTime() - now.getTime()
    const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000))

    return daysRemaining
  }
}
