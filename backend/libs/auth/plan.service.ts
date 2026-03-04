import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Returns the plan tier string (e.g. 'starter', 'growth', 'enterprise'), or 'FREE' if no subscription found. */
  async getPlan(tenantId: string): Promise<string> {
    const sub = await this.prisma.subscription.findUnique({ where: { tenant_id: tenantId } })
    return sub?.plan_tier ?? 'FREE'
  }
}
