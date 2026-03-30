import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import type { GeneratedPrismaClient } from '../../types/prisma-generated'

const EXCLUDED_PATHS = [
  '/api/licensing',
  '/health',
  '/readiness',
  '/api/health',
  '/api/ready',
]

@Injectable()
export class LicensingGuard implements CanActivate {
  private readonly logger = new Logger(LicensingGuard.name)
  private cachedStatus: { activated: boolean; checkedAt: number } | null = null
  private readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

  constructor(private readonly prisma: PrismaClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip if licensing is disabled (seller's own instance)
    if (process.env.LICENSING_ENABLED === 'false') {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const path: string = request.path || request.url || ''

    // Skip excluded paths
    if (EXCLUDED_PATHS.some(p => path.startsWith(p))) {
      return true
    }

    const activated = await this.isActivated()
    if (!activated) {
      throw new ForbiddenException({
        error: 'LICENSE_REQUIRED',
        message: 'This instance is not activated. Please enter your license key to continue.',
      })
    }

    return true
  }

  private async isActivated(): Promise<boolean> {
    // Use cache if fresh
    if (this.cachedStatus && (Date.now() - this.cachedStatus.checkedAt) < this.CACHE_TTL_MS) {
      return this.cachedStatus.activated
    }

    try {
      const activation = await (this.prisma as unknown as GeneratedPrismaClient).instanceActivation.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { created_at: 'desc' },
      })

      const activated = !!activation
      this.cachedStatus = { activated, checkedAt: Date.now() }

      // Check if re-verification is overdue (7-day grace)
      if (activation?.last_verified_at) {
        const daysSinceVerification = (Date.now() - activation.last_verified_at.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceVerification > 7) {
          this.logger.warn(`License verification overdue by ${Math.floor(daysSinceVerification)} days`)
          // Don't immediately block — the worker re-verification will handle suspension
          // But log the warning for monitoring
        }
      }

      return activated
    } catch (err) {
      this.logger.warn(`License check failed: ${(err as Error).message}`)
      // Fail open on DB errors (graceful degradation)
      return this.cachedStatus?.activated ?? true
    }
  }

  /** Called by the worker when re-verification changes status */
  clearCache() {
    this.cachedStatus = null
  }
}
