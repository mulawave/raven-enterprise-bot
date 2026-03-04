import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

const PLAN_GRACE_PERIODS: Record<string, number> = {
  FREE: 0,
  BASIC: 7,
  PRO: 14,
}

@Injectable()
export class GracePeriodChecker {
  constructor(private readonly prisma: PrismaClient) {}

  async isInGracePeriod(tenantId: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } })
    if (!tenant) return false
    const sub = await this.prisma.subscription.findUnique({ where: { tenant_id: tenantId } })
    const plan = sub?.plan_tier?.toUpperCase() ?? 'FREE'
    const graceDays = PLAN_GRACE_PERIODS[plan] ?? 0
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    })
    if (!lastInvoice || lastInvoice.status === 'paid') return false
    const overdueDays = (Date.now() - new Date(lastInvoice.created_at).getTime()) / (1000 * 60 * 60 * 24)
    return overdueDays <= graceDays
  }

  async canAccessMessaging(tenantId: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, suspended: true } })
    if (!tenant) return true
    return this.isInGracePeriod(tenantId)
  }

  async canAccessOrdering(tenantId: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, suspended: true } })
    return !tenant
  }
}
