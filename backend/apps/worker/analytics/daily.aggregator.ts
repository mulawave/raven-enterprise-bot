import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { TenantAnalyticsStore } from '../../../libs/monitoring/analytics.store'

@Injectable()
export class DailyAggregator {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly analyticsStore: TenantAnalyticsStore,
  ) {}

  async aggregateDaily(tenantId: string, day: Date): Promise<void> {
    const start = new Date(day)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)

    const [orders, bookings, payments] = await Promise.all([
      this.prisma.order.count({ where: { tenant_id: tenantId, created_at: { gte: start, lt: end } } }),
      this.prisma.booking.count({ where: { tenant_id: tenantId, created_at: { gte: start, lt: end } } }),
      this.prisma.payment.count({ where: { tenant_id: tenantId, created_at: { gte: start, lt: end } } }),
    ])

    await this.analyticsStore.storeDailyAggregate(tenantId, start, { orders, bookings, payments })
  }
}
