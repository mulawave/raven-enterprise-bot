import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

export type UsageKey = 'messages_processed' | 'orders_created' | 'bookings_created' | 'broadcasts_sent'

@Injectable()
export class UsageTracker {
  constructor(private readonly prisma: PrismaClient) {}

  async increment(tenantId: string, key: UsageKey, amount = 1) {
    await this.prisma.usage.upsert({
      where: { tenant_id_key: { tenant_id: tenantId, key } },
      update: { count: { increment: amount } },
      create: { tenant_id: tenantId, key, count: amount },
    })
  }

  async getUsage(tenantId: string, key: UsageKey) {
    const usage = await this.prisma.usage.findFirst({ where: { tenant_id: tenantId, key } })
    return usage?.count ?? 0
  }

  async getAllUsage(tenantId: string): Promise<Record<UsageKey, number>> {
    const rows = await this.prisma.usage.findMany({ where: { tenant_id: tenantId } })
    return rows.reduce<Record<UsageKey, number>>(
      (acc, row) => {
        acc[row.key as UsageKey] = row.count
        return acc
      },
      { messages_processed: 0, orders_created: 0, bookings_created: 0, broadcasts_sent: 0 },
    )
  }
}

