import { Injectable, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { NotificationService } from '../notifications/notification.service'
import { ConfigLoaderService } from '../config/config-loader.service'
import type { GeneratedPrismaClient } from '../../types/prisma-generated'

export type PlanTier = 'promo' | 'starter' | 'growth' | 'enterprise'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trial'

export interface SubscriptionPlan {
  tier: PlanTier
  name: string
  priceKobo: number
  conversationsLimit: number
  overagePriceKobo: number
}

export const PLANS: Record<PlanTier, SubscriptionPlan> = {
  promo: {
    tier: 'promo',
    name: 'Promo Plan',
    priceKobo: 1900000, // ₦19,000
    conversationsLimit: 200,
    overagePriceKobo: 15000, // ₦150 per additional conversation
  },
  starter: {
    tier: 'starter',
    name: 'Starter Plan',
    priceKobo: 4900000, // ₦49,000
    conversationsLimit: 500,
    overagePriceKobo: 12000, // ₦120 per additional conversation
  },
  growth: {
    tier: 'growth',
    name: 'Growth Plan',
    priceKobo: 19900000, // ₦199,000
    conversationsLimit: 2500,
    overagePriceKobo: 10000, // ₦100 per additional conversation
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise Plan',
    priceKobo: 79900000, // ₦799,000
    conversationsLimit: 12000,
    overagePriceKobo: 8000, // ₦80 per additional conversation
  },
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name)

  constructor(private readonly prisma: PrismaClient) {}

  private get db(): GeneratedPrismaClient {
    return this.prisma as unknown as GeneratedPrismaClient
  }

  /**
   * Look up a plan from DB, with PLANS constant as a fallback
   */
  async lookupPlan(tier: string): Promise<{ conversationsLimit: number; overagePriceKobo: number; priceKobo: number; name: string }> {
    const dbPlan = await this.prisma.plan.findUnique({ where: { tier } }).catch(() => null)
    if (dbPlan) {
      return {
        conversationsLimit: dbPlan.conversations_limit,
        overagePriceKobo: dbPlan.overage_price_kobo,
        priceKobo: dbPlan.price_kobo,
        name: dbPlan.name,
      }
    }
    const fallback = PLANS[tier as PlanTier]
    if (!fallback) throw new Error(`Unknown plan tier: ${tier}`)
    return fallback
  }

  /**
   * Create a new subscription for a tenant
   */
  async createSubscription(tenantId: string, planTier: PlanTier, initialStatus: string = 'pending_payment') {
    const plan = await this.lookupPlan(planTier)

    // Billing capability gate
    if (process.env.LICENSING_ENABLED !== 'false') {
      const inst = await this.db.instanceActivation.findFirst({ where: { status: 'ACTIVE' } }).catch(() => null)
      if (!inst) throw new Error('SERVICE_TEMPORARILY_UNAVAILABLE')
      if (inst.license_type === 'REGULAR') {
        throw new Error('BILLING_NOT_AVAILABLE_ON_CURRENT_PLAN')
      }
    }

    const now = new Date()
    const periodEnd = new Date()
    periodEnd.setDate(periodEnd.getDate() + 30) // 30-day billing cycle

    return this.prisma.subscription.create({
      data: {
        tenant_id: tenantId,
        plan_tier: planTier,
        status: initialStatus,
        current_period_start: now,
        current_period_end: periodEnd,
        conversations_used: 0,
        conversations_limit: plan.conversationsLimit,
        overage_cost_kobo: 0,
      },
    })
  }

  /**
   * Get subscription for a tenant
   */
  async getSubscription(tenantId: string) {
    return this.prisma.subscription.findUnique({
      where: { tenant_id: tenantId },
      include: { tenant: true },
    })
  }

  /**
   * Increment conversation counter (called from AI processor)
   */
  async incrementConversationCount(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenant_id: tenantId },
    })

    if (!subscription) {
      this.logger.warn(`No subscription found for tenant ${tenantId}`)
      return
    }

    // Increment counter
    await this.prisma.subscription.update({
      where: { tenant_id: tenantId },
      data: { conversations_used: { increment: 1 } },
    })

    // Check if limit exceeded (for warning notifications)
    const newCount = subscription.conversations_used + 1
    const limit = subscription.conversations_limit
    const usagePercent = (newCount / limit) * 100

    if (usagePercent >= 80 && usagePercent < 81) {
      // Send warning email at 80%
      this.logger.log(`Tenant ${tenantId} has used ${usagePercent.toFixed(0)}% of conversations`)
      try {
        const notificationService = new NotificationService(this.prisma, new ConfigLoaderService(this.prisma))
        await notificationService.send({
          tenantId,
          title: 'Usage warning',
          body: `You have used ${newCount}/${limit} conversations (${usagePercent.toFixed(0)}%). Consider upgrading your plan to avoid overage charges.`,
          type: 'alert',
          data: {
            tenantId,
            conversationsUsed: String(newCount),
            conversationsLimit: String(limit),
            usagePercent: usagePercent.toFixed(0),
          },
        })
      } catch (err) {
        this.logger.warn(`Failed to send usage warning notification for tenant ${tenantId}: ${(err as Error).message}`)
      }
    }

    if (usagePercent >= 100) {
      // Calculate overage
      const overage = newCount - limit
      const plan = await this.lookupPlan(subscription.plan_tier)
      const overageCost = overage * plan.overagePriceKobo

      await this.prisma.subscription.update({
        where: { tenant_id: tenantId },
        data: { overage_cost_kobo: overageCost },
      })

      this.logger.log(`Tenant ${tenantId} has ${overage} overage conversations (₦${overageCost / 100})`)
    }
  }

  /**
   * Calculate total bill for current period
   */
  async calculateBill(tenantId: string) {
    const subscription = await this.getSubscription(tenantId)
    if (!subscription) {
      throw new Error('Subscription not found')
    }

    const plan = await this.lookupPlan(subscription.plan_tier)
    const baseCost = plan.priceKobo
    const overageCost = subscription.overage_cost_kobo

    return {
      baseCost,
      overageCost,
      totalCost: baseCost + overageCost,
      conversationsUsed: subscription.conversations_used,
      conversationsLimit: subscription.conversations_limit,
      overageConversations: Math.max(0, subscription.conversations_used - subscription.conversations_limit),
    }
  }

  /**
   * Reset billing cycle (run at end of month)
   */
  async resetBillingCycle(tenantId: string) {
    const subscription = await this.getSubscription(tenantId)
    if (!subscription) {
      throw new Error('Subscription not found')
    }

    const now = new Date()
    const nextPeriodEnd = new Date()
    nextPeriodEnd.setDate(nextPeriodEnd.getDate() + 30)

    await this.prisma.subscription.update({
      where: { tenant_id: tenantId },
      data: {
        current_period_start: now,
        current_period_end: nextPeriodEnd,
        conversations_used: 0,
        overage_cost_kobo: 0,
      },
    })

    return { success: true, message: 'Billing cycle reset', nextBillingDate: nextPeriodEnd }
  }

  /**
   * Upgrade/downgrade plan
   */
  async changePlan(tenantId: string, newPlanTier: PlanTier) {
    const newPlan = await this.lookupPlan(newPlanTier)

    await this.prisma.subscription.update({
      where: { tenant_id: tenantId },
      data: {
        plan_tier: newPlanTier,
        conversations_limit: newPlan.conversationsLimit,
      },
    })

    return { success: true, message: `Plan changed to ${newPlan.name}` }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(tenantId: string) {
    await this.prisma.subscription.update({
      where: { tenant_id: tenantId },
      data: { status: 'cancelled' },
    })

    return { success: true, message: 'Subscription cancelled. Data will be retained for 30 days.' }
  }

  /**
   * Get usage stats for dashboard
   */
  async getUsageStats(tenantId: string) {
    const subscription = await this.getSubscription(tenantId)
    if (!subscription) {
      return null
    }

    const usagePercent = (subscription.conversations_used / subscription.conversations_limit) * 100
    const remainingConversations = Math.max(0, subscription.conversations_limit - subscription.conversations_used)

    return {
      planTier: subscription.plan_tier,
      status: subscription.status,
      conversationsUsed: subscription.conversations_used,
      conversationsLimit: subscription.conversations_limit,
      remainingConversations,
      usagePercent: Math.round(usagePercent),
      overageCost: subscription.overage_cost_kobo,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      daysUntilRenewal: Math.ceil(
        (subscription.current_period_end.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    }
  }
}
