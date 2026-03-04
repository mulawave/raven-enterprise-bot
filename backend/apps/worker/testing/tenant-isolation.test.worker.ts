export type PrismaIsolationClient = {
  order: { findFirst: (args: any) => Promise<any>; count: (args: any) => Promise<number> }
  booking: { findFirst: (args: any) => Promise<any>; count: (args: any) => Promise<number> }
  customer: { findFirst: (args: any) => Promise<any>; count: (args: any) => Promise<number> }
  menuItem: { count: (args: any) => Promise<number> }
  roomType: { count: (args: any) => Promise<number> }
}

export type CacheClient = {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string, mode?: string, durationSeconds?: number) => Promise<unknown>
  del: (key: string) => Promise<unknown>
}

export type AccessCheck = {
  tenantId: string
  orderId?: string
  bookingId?: string
  customerId?: string
}

export type IsolationTestInput = {
  tenantIds: string[]
  accessChecks: AccessCheck[]
  cacheTtlSeconds?: number
}

export type IsolationTestResult = {
  concurrentReads: { totalTenants: number; passed: number; failed: number }
  crossTenantAccess: { totalChecks: number; blocked: number; leaked: number }
  cacheIsolation: { totalTenants: number; isolated: number; leaked: number }
}

export class TenantIsolationTestWorker {
  constructor(private readonly prisma: PrismaIsolationClient, private readonly cache: CacheClient) {}

  async run(input: IsolationTestInput): Promise<IsolationTestResult> {
    const concurrent = await this.testConcurrentReads(input.tenantIds)
    const crossTenant = await this.testCrossTenantAccess(input.accessChecks)
    const cache = await this.testCacheIsolation(input.tenantIds, input.cacheTtlSeconds ?? 60)
    return {
      concurrentReads: concurrent,
      crossTenantAccess: crossTenant,
      cacheIsolation: cache,
    }
  }

  private async testConcurrentReads(tenantIds: string[]) {
    let passed = 0
    let failed = 0
    await Promise.all(
      tenantIds.map(async (tenantId) => {
        try {
          await Promise.all([
            this.prisma.order.count({ where: { tenant_id: tenantId } }),
            this.prisma.booking.count({ where: { tenant_id: tenantId } }),
            this.prisma.customer.count({ where: { tenant_id: tenantId } }),
            this.prisma.menuItem.count({ where: { tenant_id: tenantId } }),
            this.prisma.roomType.count({ where: { tenant_id: tenantId } }),
          ])
          passed++
        } catch {
          failed++
        }
      })
    )
    return { totalTenants: tenantIds.length, passed, failed }
  }

  private async testCrossTenantAccess(checks: AccessCheck[]) {
    let blocked = 0
    let leaked = 0
    for (const check of checks) {
      const tenantId = check.tenantId
      if (check.orderId) {
        const order = await this.prisma.order.findFirst({ where: { id: check.orderId, tenant_id: tenantId } })
        order ? leaked++ : blocked++
      }
      if (check.bookingId) {
        const booking = await this.prisma.booking.findFirst({ where: { id: check.bookingId, tenant_id: tenantId } })
        booking ? leaked++ : blocked++
      }
      if (check.customerId) {
        const customer = await this.prisma.customer.findFirst({ where: { id: check.customerId, tenant_id: tenantId } })
        customer ? leaked++ : blocked++
      }
    }
    return { totalChecks: blocked + leaked, blocked, leaked }
  }

  private async testCacheIsolation(tenantIds: string[], ttlSeconds: number) {
    const keys = tenantIds.map((tenantId) => this.cacheKey(tenantId))
    await Promise.all(keys.map((key, i) => this.cache.set(key, `tenant-${tenantIds[i]}`, 'EX', ttlSeconds)))
    let isolated = 0
    let leaked = 0
    for (let i = 0; i < tenantIds.length; i++) {
      const value = await this.cache.get(keys[i])
      if (value === `tenant-${tenantIds[i]}`) isolated++
      else leaked++
    }
    await Promise.all(keys.map((key) => this.cache.del(key)))
    return { totalTenants: tenantIds.length, isolated, leaked }
  }

  private cacheKey(tenantId: string): string {
    return `test:tenant:isolation:${tenantId}`
  }
}
