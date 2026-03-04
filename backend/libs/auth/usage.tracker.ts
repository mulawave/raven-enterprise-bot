import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class UsageTracker {
  constructor(private readonly prisma: PrismaClient) {}

  async increment(tenantId: string, key: string, amount = 1) {
    await this.prisma.usage.upsert({
      where: { tenant_id_key: { tenant_id: tenantId, key } },
      update: { count: { increment: amount } },
      create: { tenant_id: tenantId, key, count: amount },
    })
  }

  async getUsage(tenantId: string, key: string) {
    const usage = await this.prisma.usage.findFirst({ where: { tenant_id: tenantId, key } })
    return usage?.count ?? 0
  }

  async checkLimit(tenantId: string, key: string, limit: number) {
    const count = await this.getUsage(tenantId, key)
    return count < limit
  }
}
