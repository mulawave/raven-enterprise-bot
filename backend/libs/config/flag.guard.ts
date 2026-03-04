import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { FeatureFlagService } from './feature-flag.service'

/**
 * Feature-flag middleware factory — use the injectable FeatureFlagService via DI.
 * Create a specific middleware class per flag, or use this factory in AppModule.
 */
export function flagGuardMiddleware(flagService: FeatureFlagService, flag: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.tenant?.id ?? req.user?.tenant_id
    if (!tenantId) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    const enabled = await flagService.isEnabled(tenantId, flag)
    if (!enabled) {
      res.status(403).json({ error: 'Feature disabled' })
      return
    }
    next()
  }
}
