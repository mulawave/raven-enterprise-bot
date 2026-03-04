import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { InvoiceGenerator } from './invoice.generator'

@Injectable()
export class ChargeScheduler {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly invoiceGen: InvoiceGenerator,
  ) {}

  async scheduleMonthlyCharge(
    tenantId: string,
    plan: string,
    usage: Record<string, number>,
    period: string,
  ): Promise<{ invoiceId: string; amount: number }> {
    void this.prisma // available for future queries
    return this.invoiceGen.generateInvoice(tenantId, plan as 'FREE' | 'BASIC' | 'PRO', usage, period)
  }
}
