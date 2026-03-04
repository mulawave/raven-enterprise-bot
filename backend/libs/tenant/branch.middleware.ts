import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { BranchService } from './branch.service'

/**
 * Resolves the active branch for the request from headers.
 * Falls back to the tenant's default branch if x-branch-id is absent.
 */
@Injectable()
export class BranchResolverMiddleware implements NestMiddleware {
  constructor(private readonly branchService: BranchService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tenantId = req.headers['x-tenant-id'] as string | undefined
    let branchId = req.headers['x-branch-id'] as string | undefined
    if (!tenantId) {
      res.status(400).json({ error: 'Missing tenant id' })
      return
    }
    if (!branchId) {
      const branch = await this.branchService.getOrCreateDefaultBranch(tenantId)
      branchId = branch.id
    }
    req.branchId = branchId
    next()
  }
}
