import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import type { GeneratedPrismaClient } from '../../../types/prisma-generated'

/**
 * Periodic license re-verification and heartbeat writer.
 *
 * - Heartbeat: writes LICENSING_HEARTBEAT to SystemConfig every hour.
 * - Verify:   phones home to the licensing server every 24 hours;
 *             suspends the local InstanceActivation if the license has been revoked.
 * - Grace:    7-day offline grace period before auto-suspension.
 */
@Injectable()
export class LicenseVerifyWorker implements OnModuleInit {
  private readonly logger = new Logger(LicenseVerifyWorker.name)

  constructor(private readonly prisma: PrismaClient) {}

  async onModuleInit() {
    if (process.env.LICENSING_ENABLED === 'false') {
      this.logger.log('Licensing disabled — skipping verification worker')
      return
    }
    this.startHeartbeat()
    this.startVerification()
  }

  /* ── Heartbeat (every 60 min) ─────────────────────────────────────── */

  private startHeartbeat() {
    const run = async () => {
      try {
        await this.prisma.systemConfig.upsert({
          where: { key: 'LICENSING_HEARTBEAT' },
          update: { value: new Date().toISOString() },
          create: {
            key: 'LICENSING_HEARTBEAT',
            value: new Date().toISOString(),
            description: 'Last worker heartbeat timestamp',
            group: 'licensing',
          },
        })
      } catch (err) {
        this.logger.error('Heartbeat write failed', (err as Error).message)
      }
    }
    run() // immediate first write
    setInterval(run, 60 * 60 * 1000) // every hour
  }

  /* ── License verification (every 24h) ─────────────────────────────── */

  private startVerification() {
    const run = async () => {
      try {
        const inst = await (this.prisma as unknown as GeneratedPrismaClient).instanceActivation.findFirst({
          where: { status: { in: ['ACTIVE', 'PENDING'] } },
        })
        if (!inst) return

        const serverUrl = process.env.LICENSING_SERVER_URL
        if (!serverUrl) {
          this.logger.warn('LICENSING_SERVER_URL not set — skipping verification')
          return
        }

        const res = await fetch(`${serverUrl}/api/licensing/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verification_token: inst.verification_token,
            domain: inst.domain,
          }),
        }).catch(() => null)

        if (res && res.ok) {
          const body = (await res.json()) as { valid: boolean }
          if (body.valid) {
            await (this.prisma as unknown as GeneratedPrismaClient).instanceActivation.update({
              where: { id: inst.id },
              data: { last_verified_at: new Date() },
            })
            this.logger.log('License re-verified successfully')
          } else {
            await (this.prisma as unknown as GeneratedPrismaClient).instanceActivation.update({
              where: { id: inst.id },
              data: { status: 'SUSPENDED' },
            })
            this.logger.warn('License revoked remotely — instance suspended')
          }
        } else {
          // Server unreachable — check grace period
          if (inst.last_verified_at) {
            const daysSince = (Date.now() - new Date(inst.last_verified_at).getTime()) / 86_400_000
            if (daysSince > 7) {
              await (this.prisma as unknown as GeneratedPrismaClient).instanceActivation.update({
                where: { id: inst.id },
                data: { status: 'SUSPENDED' },
              })
              this.logger.warn(`Grace period expired (${daysSince.toFixed(1)} days offline) — instance suspended`)
            } else {
              this.logger.warn(`Licensing server unreachable — ${daysSince.toFixed(1)}/7 grace days used`)
            }
          }
        }
      } catch (err) {
        this.logger.error('Verification cycle failed', (err as Error).message)
      }
    }

    // First check after 5 minutes, then every 24 hours
    setTimeout(run, 5 * 60 * 1000)
    setInterval(run, 24 * 60 * 60 * 1000)
  }
}
