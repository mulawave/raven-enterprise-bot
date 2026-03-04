import { PrismaClient } from '@prisma/client';
export type PlanTier = 'starter' | 'growth' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due';
export interface SubscriptionPlan {
    tier: PlanTier;
    name: string;
    priceKobo: number;
    conversationsLimit: number;
    overagePriceKobo: number;
}
export declare const PLANS: Record<PlanTier, SubscriptionPlan>;
export declare class SubscriptionsService {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    /**
     * Create a new subscription for a tenant
     */
    createSubscription(tenantId: string, planTier: PlanTier): Promise<{
        status: string;
        id: string;
        tenant_id: string;
        created_at: Date;
        updated_at: Date;
        plan_tier: string;
        current_period_start: Date;
        current_period_end: Date;
        conversations_used: number;
        conversations_limit: number;
        overage_cost_kobo: number;
        paystack_plan_code: string | null;
        paystack_subscription_code: string | null;
    }>;
    /**
     * Get subscription for a tenant
     */
    getSubscription(tenantId: string): Promise<({
        tenant: {
            name: string;
            id: string;
            created_at: Date;
            updated_at: Date;
            logo_url: string | null;
            theme: string | null;
        };
    } & {
        status: string;
        id: string;
        tenant_id: string;
        created_at: Date;
        updated_at: Date;
        plan_tier: string;
        current_period_start: Date;
        current_period_end: Date;
        conversations_used: number;
        conversations_limit: number;
        overage_cost_kobo: number;
        paystack_plan_code: string | null;
        paystack_subscription_code: string | null;
    }) | null>;
    /**
     * Increment conversation counter (called from AI processor)
     */
    incrementConversationCount(tenantId: string): Promise<void>;
    /**
     * Calculate total bill for current period
     */
    calculateBill(tenantId: string): Promise<{
        baseCost: number;
        overageCost: number;
        totalCost: number;
        conversationsUsed: number;
        conversationsLimit: number;
        overageConversations: number;
    }>;
    /**
     * Reset billing cycle (run at end of month)
     */
    resetBillingCycle(tenantId: string): Promise<{
        success: boolean;
        message: string;
        nextBillingDate: Date;
    }>;
    /**
     * Upgrade/downgrade plan
     */
    changePlan(tenantId: string, newPlanTier: PlanTier): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Cancel subscription
     */
    cancelSubscription(tenantId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Get usage stats for dashboard
     */
    getUsageStats(tenantId: string): Promise<{
        planTier: string;
        status: string;
        conversationsUsed: number;
        conversationsLimit: number;
        remainingConversations: number;
        usagePercent: number;
        overageCost: number;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        daysUntilRenewal: number;
    } | null>;
}
