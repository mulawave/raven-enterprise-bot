import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

export interface DailyAggregate {
  orders: number
  bookings: number
  payments: number
}

@Injectable()
export class TenantAnalyticsStore {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Persist raw audit-log events (no-op store — events are already in AuditLog;
   * this gives EventCollector a consistent interface to call).
   */
  async storeEvents(tenantId: string, events: unknown[]): Promise<void> {
    // events are already persisted in AuditLog via the audit logger.
    // This hook can be used in future to forward to an external analytics sink.
    void tenantId
    void events
  }

  /**
   * Persist a pre-computed daily aggregate into AuditLog as a structured record.
   * Using action = 'DAILY_AGGREGATE:<date>' keeps it queryable without a new model.
   */
  async storeDailyAggregate(
    tenantId: string,
    day: Date,
    aggregate: DailyAggregate,
  ): Promise<void> {
    const dateStr = day.toISOString().slice(0, 10) // YYYY-MM-DD
    await this.prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        entity_id: `daily:${dateStr}`,
        action: `DAILY_AGGREGATE:${dateStr}`,
        metadata: JSON.stringify(aggregate),
        timestamp: day,
      },
    })
  }
}
