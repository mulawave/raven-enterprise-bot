"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = exports.PLANS = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
exports.PLANS = {
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
};
let SubscriptionsService = class SubscriptionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Create a new subscription for a tenant
     */
    async createSubscription(tenantId, planTier) {
        const plan = exports.PLANS[planTier];
        const now = new Date();
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30); // 30-day billing cycle
        return this.prisma.subscription.create({
            data: {
                tenant_id: tenantId,
                plan_tier: planTier,
                status: 'active',
                current_period_start: now,
                current_period_end: periodEnd,
                conversations_used: 0,
                conversations_limit: plan.conversationsLimit,
                overage_cost_kobo: 0,
            },
        });
    }
    /**
     * Get subscription for a tenant
     */
    async getSubscription(tenantId) {
        return this.prisma.subscription.findUnique({
            where: { tenant_id: tenantId },
            include: { tenant: true },
        });
    }
    /**
     * Increment conversation counter (called from AI processor)
     */
    async incrementConversationCount(tenantId) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenant_id: tenantId },
        });
        if (!subscription) {
            console.warn(`[Subscription] No subscription found for tenant ${tenantId}`);
            return;
        }
        // Increment counter
        await this.prisma.subscription.update({
            where: { tenant_id: tenantId },
            data: { conversations_used: { increment: 1 } },
        });
        // Check if limit exceeded (for warning notifications)
        const newCount = subscription.conversations_used + 1;
        const limit = subscription.conversations_limit;
        const usagePercent = (newCount / limit) * 100;
        if (usagePercent >= 80 && usagePercent < 81) {
            // Send warning email at 80%
            console.log(`[Subscription] Tenant ${tenantId} has used ${usagePercent.toFixed(0)}% of conversations`);
            // TODO: Trigger email notification
        }
        if (usagePercent >= 100) {
            // Calculate overage
            const overage = newCount - limit;
            const plan = exports.PLANS[subscription.plan_tier];
            const overageCost = overage * plan.overagePriceKobo;
            await this.prisma.subscription.update({
                where: { tenant_id: tenantId },
                data: { overage_cost_kobo: overageCost },
            });
            console.log(`[Subscription] Tenant ${tenantId} has ${overage} overage conversations (₦${overageCost / 100})`);
        }
    }
    /**
     * Calculate total bill for current period
     */
    async calculateBill(tenantId) {
        const subscription = await this.getSubscription(tenantId);
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        const plan = exports.PLANS[subscription.plan_tier];
        const baseCost = plan.priceKobo;
        const overageCost = subscription.overage_cost_kobo;
        return {
            baseCost,
            overageCost,
            totalCost: baseCost + overageCost,
            conversationsUsed: subscription.conversations_used,
            conversationsLimit: subscription.conversations_limit,
            overageConversations: Math.max(0, subscription.conversations_used - subscription.conversations_limit),
        };
    }
    /**
     * Reset billing cycle (run at end of month)
     */
    async resetBillingCycle(tenantId) {
        const subscription = await this.getSubscription(tenantId);
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        const now = new Date();
        const nextPeriodEnd = new Date();
        nextPeriodEnd.setDate(nextPeriodEnd.getDate() + 30);
        await this.prisma.subscription.update({
            where: { tenant_id: tenantId },
            data: {
                current_period_start: now,
                current_period_end: nextPeriodEnd,
                conversations_used: 0,
                overage_cost_kobo: 0,
            },
        });
        return { success: true, message: 'Billing cycle reset', nextBillingDate: nextPeriodEnd };
    }
    /**
     * Upgrade/downgrade plan
     */
    async changePlan(tenantId, newPlanTier) {
        const newPlan = exports.PLANS[newPlanTier];
        await this.prisma.subscription.update({
            where: { tenant_id: tenantId },
            data: {
                plan_tier: newPlanTier,
                conversations_limit: newPlan.conversationsLimit,
            },
        });
        return { success: true, message: `Plan changed to ${newPlan.name}` };
    }
    /**
     * Cancel subscription
     */
    async cancelSubscription(tenantId) {
        await this.prisma.subscription.update({
            where: { tenant_id: tenantId },
            data: { status: 'cancelled' },
        });
        return { success: true, message: 'Subscription cancelled. Data will be retained for 30 days.' };
    }
    /**
     * Get usage stats for dashboard
     */
    async getUsageStats(tenantId) {
        const subscription = await this.getSubscription(tenantId);
        if (!subscription) {
            return null;
        }
        const usagePercent = (subscription.conversations_used / subscription.conversations_limit) * 100;
        const remainingConversations = Math.max(0, subscription.conversations_limit - subscription.conversations_used);
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
            daysUntilRenewal: Math.ceil((subscription.current_period_end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        };
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], SubscriptionsService);
