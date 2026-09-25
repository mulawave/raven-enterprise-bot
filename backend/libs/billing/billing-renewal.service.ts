import { Injectable, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PaystackService } from '../payments/paystack.service'
import { ConfigLoaderService } from '../config/config-loader.service'
import { NotificationService } from '../notifications/notification.service'
import { SubscriptionsService } from './subscriptions.service'

const BILLING_PERIOD_DAYS = 30
/** Don't hit the same subscription twice within this window (multi-instance safety + Paystack latency) */
const MIN_ATTEMPT_INTERVAL_MS = 30 * 60 * 1000

type DueSubscription = {
  id: string
  tenant_id: string
  status: string
  plan_tier: string
  post_trial_plan_tier: string | null
  cancel_at_period_end: boolean
  paystack_authorization_code: string | null
  billing_email: string | null
  current_period_end: Date
  last_charge_attempt_at: Date | null
}

export type RenewalOutcome = 'activated' | 'past_due' | 'cancelled' | 'pending' | 'skipped'

/**
 * Ends trials and renews paid periods by charging the saved Paystack card.
 *
 * - trial → active on successful charge of the plan chosen at signup
 * - trial/active → past_due when the charge fails (bot pauses, data kept)
 * - trial/active → cancelled when the tenant turned off auto-renew
 *
 * Active subscriptions without a saved card (manual payers from before
 * card-up-front) are left alone.
 */
@Injectable()
export class BillingRenewalService {
  private readonly logger = new Logger(BillingRenewalService.name)

  constructor(
    private readonly prisma: PrismaClient,
    private readonly configLoader: ConfigLoaderService,
    private readonly notificationService: NotificationService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async processDueSubscriptions(now: Date = new Date()): Promise<Record<RenewalOutcome, number>> {
    const due: DueSubscription[] = await this.prisma.subscription.findMany({
      where: {
        OR: [
          { status: 'trial', trial_ends_at: { lte: now } },
          { status: 'active', current_period_end: { lte: now }, paystack_authorization_code: { not: null } },
          { status: 'active', current_period_end: { lte: now }, cancel_at_period_end: true },
        ],
      },
    })

    const counts: Record<RenewalOutcome, number> = { activated: 0, past_due: 0, cancelled: 0, pending: 0, skipped: 0 }
    for (const sub of due) {
      try {
        counts[await this.renew(sub, now)]++
      } catch (err) {
        counts.skipped++
        this.logger.error(`Renewal failed for tenant ${sub.tenant_id}: ${(err as Error).message}`)
      }
    }
    if (due.length) this.logger.log(`Renewal run: ${JSON.stringify(counts)}`)
    return counts
  }

  private async renew(sub: DueSubscription, now: Date): Promise<RenewalOutcome> {
    // Claim the row so concurrent API instances don't charge the same period twice
    const claimed = await this.prisma.subscription.updateMany({
      where: {
        id: sub.id,
        status: sub.status,
        OR: [
          { last_charge_attempt_at: null },
          { last_charge_attempt_at: { lt: new Date(now.getTime() - MIN_ATTEMPT_INTERVAL_MS) } },
        ],
      },
      data: { last_charge_attempt_at: now },
    })
    if (claimed.count !== 1) return 'skipped'

    if (sub.cancel_at_period_end) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'cancelled', last_charge_error: null },
      })
      await this.notify(sub.tenant_id, 'Subscription ended', 'Your Raven subscription has ended as requested. Choose a plan any time to switch your assistant back on.')
      return 'cancelled'
    }

    const targetTier = sub.status === 'trial' ? (sub.post_trial_plan_tier ?? sub.plan_tier) : sub.plan_tier
    if (!sub.paystack_authorization_code || !sub.billing_email) {
      return this.markPastDue(sub, 'No saved card on file')
    }

    const plan = await this.subscriptionsService.lookupPlan(targetTier)
    // One deterministic reference per billing period: a retry re-verifies instead of charging again
    const reference = `renew-${sub.id.slice(0, 8)}-${sub.current_period_end.getTime()}`
    const paystack = new PaystackService(await this.configLoader.getPaystackSecret())

    const existing = await this.prisma.invoice.findFirst({ where: { tenant_id: sub.tenant_id, reference } })
    let status: string
    let gatewayResponse: string | undefined
    if (existing) {
      const verified = await paystack.verify(reference).catch(() => null)
      status = verified?.data?.status ?? 'failed'
      gatewayResponse = verified?.data?.gateway_response
    } else {
      await this.prisma.invoice.create({
        data: {
          tenant_id: sub.tenant_id,
          plan: targetTier,
          period: now.toISOString().slice(0, 7),
          amount: plan.priceKobo / 100,
          status: 'pending',
          reference,
        },
      })
      try {
        const result = await paystack.chargeAuthorization(
          sub.paystack_authorization_code,
          sub.billing_email,
          plan.priceKobo,
          reference,
          { tenant_id: sub.tenant_id, purpose: sub.status === 'trial' ? 'trial_conversion' : 'renewal' },
        )
        status = result.status
        gatewayResponse = result.gatewayResponse
      } catch (err) {
        status = 'failed'
        gatewayResponse = (err as Error).message
      }
    }

    if (status === 'success') {
      const periodEnd = new Date(now.getTime() + BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000)
      await this.prisma.$transaction([
        this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'active',
            plan_tier: targetTier,
            conversations_limit: plan.conversationsLimit,
            conversations_used: 0,
            overage_cost_kobo: 0,
            current_period_start: now,
            current_period_end: periodEnd,
            last_charge_error: null,
            ...(sub.status === 'trial' ? { trial_converted_at: now } : {}),
          },
        }),
        this.prisma.invoice.updateMany({ where: { tenant_id: sub.tenant_id, reference }, data: { status: 'paid' } }),
      ])
      await this.notify(
        sub.tenant_id,
        sub.status === 'trial' ? 'Your subscription is now active' : 'Subscription renewed',
        `We charged ₦${(plan.priceKobo / 100).toLocaleString('en-NG')} for the ${plan.name}. Thank you!`,
      )
      return 'activated'
    }

    if (status === 'pending' || status === 'ongoing' || status === 'processing') {
      // Leave as-is; the next run re-verifies this reference
      return 'pending'
    }

    await this.prisma.invoice.updateMany({ where: { tenant_id: sub.tenant_id, reference }, data: { status: 'failed' } })
    return this.markPastDue(sub, gatewayResponse ?? status)
  }

  private async markPastDue(sub: DueSubscription, reason: string): Promise<RenewalOutcome> {
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'past_due', last_charge_error: reason.slice(0, 500) },
    })
    this.logger.warn(`Tenant ${sub.tenant_id} moved to past_due: ${reason}`)
    await this.notify(
      sub.tenant_id,
      'Payment failed — assistant paused',
      'We could not charge your card, so your assistant has paused. Your data is safe. Update your payment to resume instantly.',
    )
    return 'past_due'
  }

  private async notify(tenantId: string, title: string, body: string) {
    await this.notificationService
      .send({ tenantId, title, body, type: 'payment' })
      .catch((err) => this.logger.warn(`Billing notification failed for ${tenantId}: ${(err as Error).message}`))
  }
}
