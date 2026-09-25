import { Controller, Get, UseGuards } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'

function parsePlanFeatures(raw: string): string[] {
  try { return JSON.parse(raw) as string[] } catch { return [] }
}

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`
}

@Controller('api/plans')
export class PlansController {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * GET /api/plans/public
   * No authentication required — returns active plans for registration page,
   * public pricing, and unauthenticated funnel surfaces.
   */
  @Get('public')
  async getPublicPlans() {
    const plans = await this.prisma.plan.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    })
    return {
      plans: plans.map((p) => ({
        tier: p.tier,
        name: p.name,
        description: p.description ?? null,
        price_kobo: p.price_kobo,
        price_formatted: formatNaira(p.price_kobo),
        conversations_limit: p.conversations_limit,
        overage_price_kobo: p.overage_price_kobo,
        overage_price_formatted: formatNaira(p.overage_price_kobo),
        features: parsePlanFeatures(p.features as string),
        is_active: p.is_active,
        sort_order: p.sort_order,
      })),
    }
  }

  /**
   * GET /api/plans
   * Requires tenant JWT — returns active plans + the tenant's currentPlanTier
   * so upgrade modals can highlight the current plan and disable same-tier selection.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getPlans(@CurrentUser() user: any) {
    const [plans, subscription] = await Promise.all([
      this.prisma.plan.findMany({
        where: { is_active: true },
        orderBy: { sort_order: 'asc' },
      }),
      this.prisma.subscription.findUnique({
        where: { tenant_id: user.tenant_id },
        select: { plan_tier: true },
      }),
    ])

    return {
      currentPlanTier: subscription?.plan_tier ?? 'starter',
      plans: plans.map((p) => ({
        tier: p.tier,
        name: p.name,
        description: p.description ?? null,
        price_kobo: p.price_kobo,
        price_formatted: formatNaira(p.price_kobo),
        conversations_limit: p.conversations_limit,
        overage_price_kobo: p.overage_price_kobo,
        overage_price_formatted: formatNaira(p.overage_price_kobo),
        features: parsePlanFeatures(p.features as string),
        is_active: p.is_active,
        sort_order: p.sort_order,
      })),
    }
  }
}
