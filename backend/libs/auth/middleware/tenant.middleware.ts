import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { UserScope } from '@prisma/client'

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const user = req.user

    // If no user yet, let the JWT guard handle authentication downstream
    if (!user) {
      return next()
    }

    // Bypass tenant requirement for SYSTEM-scoped users (SUPER_ADMIN)
    if (user.scope === UserScope.SYSTEM) {
      req.tenant_id = null
      return next()
    }

    // For TENANT-scoped users, require tenant_id
    if (!user.tenant_id) {
      throw new UnauthorizedException('Tenant required')
    }
    req.tenant_id = user.tenant_id
    next()
  }
}
