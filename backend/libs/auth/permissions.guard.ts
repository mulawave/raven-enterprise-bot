import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { StaffScopeService } from './staff.scope.service'
import { PrismaClient } from '@prisma/client'

/**
 * Branch permission middleware — injectable via NestJS DI.
 * Apply as middleware on routes that require branch-level access checks.
 */
@Injectable()
export class BranchPermissionMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly staffScopeService: StaffScopeService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = req.user
    const branchId = req.branchId
    if (!user || !branchId) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    if (user.role === 'owner') {
      next()
      return
    }
    const allowed = await this.staffScopeService.canAccessBranch(
      { id: user.id, role: user.role },
      branchId,
    )
    if (!allowed) {
      res.status(403).json({ error: 'Branch access denied' })
      return
    }
    next()
  }
}
