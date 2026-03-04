export type TenantAnalyticsStore = {
  storeEvents: (tenantId: string, events: any[]) => Promise<void>
  storeDailyAggregate: (tenantId: string, day: Date, data: { orders: number; bookings: number; payments: number }) => Promise<void>
}

export * from './event.collector'
export * from './daily.aggregator'
