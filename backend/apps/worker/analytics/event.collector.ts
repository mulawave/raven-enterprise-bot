import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { TenantAnalyticsStore } from '../../../libs/monitoring/analytics.store'

@Injectable()
export class EventCollector {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly analyticsStore: TenantAnalyticsStore,
  ) {}

  async collectEvents(tenantId: string, since: Date): Promise<void> {
    const events = await this.prisma.auditLog.findMany({
      where: { tenant_id: tenantId, timestamp: { gte: since } },
    })
    await this.analyticsStore.storeEvents(tenantId, events)
  }
}
