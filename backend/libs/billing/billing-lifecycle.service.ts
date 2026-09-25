import { Injectable, OnModuleInit, OnApplicationShutdown, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { BillingRenewalService } from './billing-renewal.service'
import { GracePeriodChecker } from './enforcement/grace.checker'
import { DataRetentionService } from '../compliance/retention.service'

const RENEWAL_INTERVAL_MS = 60 * 60 * 1000 // 1 hour — trial endings and period renewals
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
    private readonly renewalService: BillingRenewalService,
    private readonly gracePeriodChecker: GracePeriodChecker,
    private readonly dataRetentionService: DataRetentionService,
  ) {}

  onModuleInit(): void {
    this.logger.log('BillingLifecycleService initialised — scheduling periodic jobs')

    // Grace period enforcement — check every hour
    this.graceTimer = setInterval(() => {
      void this.runGracePeriodChecks()
    }, GRACE_CHECK_INTERVAL_MS)

    // Trial conversion + renewals via saved card — check every hour
    this.billingTimer = setInterval(() => {
      void this.runRenewals()
    }, RENEWAL_INTERVAL_MS)

    // Data retention purge — run weekly
    this.retentionTimer = setInterval(() => {
      void this.runDataRetentionPurge()
    }, RETENTION_INTERVAL_MS)

    // Run grace checks and renewals immediately on startup
    void this.runGracePeriodChecks()
    void this.runRenewals()
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

  private async runRenewals(): Promise<void> {
    try {
      await this.renewalService.processDueSubscriptions()
    } catch (err) {
      this.logger.error('Renewal run failed', err instanceof Error ? err.message : String(err))
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
