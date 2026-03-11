import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { BranchService } from './branch.service'

/**
 * Resolves the active branch for the request from verified tenant context.
 * Never creates persistent state during ordinary requests.
 */
@Injectable()
export class BranchResolverMiddleware implements NestMiddleware {
  constructor(private readonly branchService: BranchService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const r = req as any
    const tenantId = r.tenant_id ?? r.user?.tenant_id
    let branchId = req.headers['x-branch-id'] as string | undefined

    if (!tenantId) {
      return next()
    }

    if (branchId) {
      const branch = await this.branchService.getBranch(tenantId, branchId)
      if (!branch) {
        res.status(400).json({ error: 'Invalid branch id' })
        return
      }
      r.branchId = branch.id
      return next()
    }

    const defaultBranch = await this.branchService.getDefaultBranch(tenantId)
    if (defaultBranch) {
      r.branchId = defaultBranch.id
    }

    next()
  }
}
