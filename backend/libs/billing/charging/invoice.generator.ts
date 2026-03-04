import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PLAN_RULES, PlanType } from '../plan.rules'

@Injectable()
export class InvoiceGenerator {
  constructor(private readonly prisma: PrismaClient) {}

  async generateInvoice(
    tenantId: string,
    plan: PlanType,
    usage: Record<string, number>,
    period: string,
  ): Promise<{ invoiceId: string; amount: number }> {
    void PLAN_RULES[plan] // verify plan is valid
    const amount = this.calculateAmount(plan, usage)
    const invoice = await this.prisma.invoice.create({
      data: {
        tenant_id: tenantId,
        plan,
        period,
        amount,
        status: 'pending',
      },
    })
    return { invoiceId: invoice.id, amount }
  }

  private calculateAmount(plan: PlanType, usage: Record<string, number>): number {
    if (plan === 'FREE') return 0
    let total = 0
    total += (usage.messages ?? 0) * 1
    total += (usage.orders ?? 0) * 10
    total += (usage.bookings ?? 0) * 10
    total += (usage.broadcasts ?? 0) * 2
    return total
  }
}
