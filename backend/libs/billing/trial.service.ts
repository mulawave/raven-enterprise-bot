import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

export const TRIAL_DURATION_DAYS = 14
/** Trial tenants get the full product but a capped conversation allowance to contain AI cost */
export const TRIAL_CONVERSATION_CAP = 300
/** Small card-verification charge taken at signup and refunded immediately (₦50) */
export const TRIAL_CARD_CHECK_KOBO = 5000

export interface TrialStatus {
  isTrialActive: boolean
  trialStartedAt: Date | null
  trialEndsAt: Date | null
  daysRemaining: number
  hasExpired: boolean
  trialConvertedAt: Date | null
  postTrialPlanTier: string | null
  cancelAtPeriodEnd: boolean
  cardLast4: string | null
  cardBrand: string | null
}

export interface SavedCard {
  authorizationCode: string
  last4?: string | null
  brand?: string | null
  email: string
}

@Injectable()
export class TrialService {
  private readonly logger = new Logger(TrialService.name)

  constructor(private readonly prisma: PrismaClient) {}

  /** A tenant can start a trial once, before they have ever paid. */
  isEligible(subscription: { status: string; trial_started_at: Date | null }): boolean {
    return subscription.status === 'pending_payment' && subscription.trial_started_at === null
  }

  /**
   * Start the 14-day trial after the customer's card has been verified.
   * The plan they chose at signup is billed automatically to the saved card
   * when the trial ends (see BillingRenewalService).
   */
  async startTrialWithCard(tenantId: string, card: SavedCard): Promise<{ trialStartedAt: Date; trialEndsAt: Date }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenant_id: tenantId },
    })

    if (!subscription) {
      throw new BadRequestException('Subscription not found')
    }
    if (!this.isEligible(subscription)) {
      throw new BadRequestException('This account is not eligible for a free trial')
    }

    const now = new Date()
    const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000)

    const updated = await this.prisma.subscription.update({
      where: { tenant_id: tenantId },
      data: {
        status: 'trial',
        post_trial_plan_tier: subscription.plan_tier,
        trial_started_at: now,
        trial_ends_at: trialEndsAt,
        current_period_start: now,
        current_period_end: trialEndsAt,
        conversations_limit: TRIAL_CONVERSATION_CAP,
        conversations_used: 0,
        cancel_at_period_end: false,
        paystack_authorization_code: card.authorizationCode,
        card_last4: card.last4 ?? null,
        card_brand: card.brand ?? null,
        billing_email: card.email,
      },
    })

    this.logger.log(`Trial started for tenant ${tenantId}, ends at ${trialEndsAt.toISOString()}`)

    return {
      trialStartedAt: updated.trial_started_at!,
      trialEndsAt: updated.trial_ends_at!,
    }
  }

  async getTrialStatus(tenantId: string): Promise<TrialStatus> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenant_id: tenantId },
    })

    if (!subscription) {
      throw new BadRequestException('Subscription not found')
    }

    const hasExpired = subscription.trial_ends_at ? new Date() > subscription.trial_ends_at : false

    return {
      isTrialActive: subscription.status === 'trial' && !hasExpired,
      trialStartedAt: subscription.trial_started_at,
      trialEndsAt: subscription.trial_ends_at,
      daysRemaining: Math.max(0, this.calculateDaysRemaining(subscription.trial_ends_at)),
      hasExpired,
      trialConvertedAt: subscription.trial_converted_at,
      postTrialPlanTier: subscription.post_trial_plan_tier ?? subscription.plan_tier,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cardLast4: subscription.card_last4,
      cardBrand: subscription.card_brand,
    }
  }

  /**
   * Stop (or resume) the automatic charge at the end of the current trial or
   * billing period. The account keeps working until that date.
   */
  async setCancelAtPeriodEnd(tenantId: string, cancel: boolean): Promise<{ cancelAtPeriodEnd: boolean }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenant_id: tenantId },
    })

    if (!subscription) {
      throw new BadRequestException('Subscription not found')
    }
    if (subscription.status !== 'trial' && subscription.status !== 'active') {
      throw new BadRequestException('Only a trial or active subscription can be cancelled')
    }

    await this.prisma.subscription.update({
      where: { tenant_id: tenantId },
      data: { cancel_at_period_end: cancel },
    })

    this.logger.log(`Tenant ${tenantId} set cancel_at_period_end=${cancel}`)
    return { cancelAtPeriodEnd: cancel }
  }

  private calculateDaysRemaining(trialEndsAt: Date | null): number {
    if (!trialEndsAt) return 0
    const msRemaining = trialEndsAt.getTime() - Date.now()
    return Math.ceil(msRemaining / (24 * 60 * 60 * 1000))
  }
}
