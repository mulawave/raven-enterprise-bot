import { Injectable, OnModuleInit, OnApplicationShutdown, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { ChargeScheduler } from './charging/charge.scheduler'
import { GracePeriodChecker } from './enforcement/grace.checker'
import { DataRetentionService } from '../compliance/retention.service'

const BILLING_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours
const GRACE_CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 hour
const RETENTION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

@Injectable()
export class BillingLifecycleService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(BillingLifecycleService.name)
  private billingTimer?: ReturnType<typeof setInterval>
  private graceTimer?: ReturnType<typeof setInterval>
  private retentionTimer?: ReturnType<typeof setInterval>

  constructor(
    private readonly prisma: PrismaClient,
    private readonly chargeScheduler: ChargeScheduler,
    private readonly gracePeriodChecker: GracePeriodChecker,
    private readonly dataRetentionService: DataRetentionService,
  ) {}

  onModuleInit(): void {
    this.logger.log('BillingLifecycleService initialised — scheduling periodic jobs')

    // Grace period enforcement — check every hour
    this.graceTimer = setInterval(() => {
      void this.runGracePeriodChecks()
    }, GRACE_CHECK_INTERVAL_MS)

    // Monthly charge scheduling — check every 24 h (actual charge only fires on billing day)
    this.billingTimer = setInterval(() => {
      void this.runMonthlyChargeCheck()
    }, BILLING_INTERVAL_MS)

    // Data retention purge — run weekly
    this.retentionTimer = setInterval(() => {
      void this.runDataRetentionPurge()
    }, RETENTION_INTERVAL_MS)

    // Run grace checks immediately on startup
    void this.runGracePeriodChecks()
  }

  onApplicationShutdown(): void {
    if (this.graceTimer) clearInterval(this.graceTimer)
    if (this.billingTimer) clearInterval(this.billingTimer)
    if (this.retentionTimer) clearInterval(this.retentionTimer)
    this.logger.log('BillingLifecycleService shutdown — timers cleared')
  }

  private async runGracePeriodChecks(): Promise<void> {
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { suspended: false },
        select: { id: true },
      })

      await Promise.all(
        tenants.map(async ({ id }) => {
          const inGrace = await this.gracePeriodChecker.isInGracePeriod(id)
          if (inGrace) {
            this.logger.warn(`Tenant ${id} is in grace period`)
          }
        }),
      )
    } catch (err) {
      this.logger.error('Grace period check failed', err instanceof Error ? err.message : String(err))
    }
  }

  private async runMonthlyChargeCheck(): Promise<void> {
    try {
      const today = new Date()
      // Only process on the 1st of each month
      if (today.getDate() !== 1) return

      const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      const subscriptions = await this.prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        select: { tenant_id: true, plan_tier: true },
      })

      await Promise.all(
        subscriptions.map(async ({ tenant_id, plan_tier }) => {
          try {
            const result = await this.chargeScheduler.scheduleMonthlyCharge(
              tenant_id,
              plan_tier,
              {},
              period,
            )
            this.logger.log(
              `Monthly charge scheduled for tenant ${tenant_id}: invoice ${result.invoiceId} — $${result.amount}`,
            )
          } catch (err) {
            this.logger.error(
              `Monthly charge failed for tenant ${tenant_id}`,
              err instanceof Error ? err.message : String(err),
            )
          }
        }),
      )
    } catch (err) {
      this.logger.error('Monthly charge check failed', err instanceof Error ? err.message : String(err))
    }
  }

  private async runDataRetentionPurge(): Promise<void> {
    try {
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } })

      await Promise.all(
        tenants.map(async ({ id }) => {
          // Purge AuditLog entries older than 90 days per tenant
          const deleted = await this.dataRetentionService.purgeOldRecords(id, 'auditLog', 90)
          if (deleted > 0) {
            this.logger.log(`Purged ${deleted} AuditLog records for tenant ${id}`)
          }
        }),
      )
    } catch (err) {
      this.logger.error('Data retention purge failed', err instanceof Error ? err.message : String(err))
    }
  }
}
