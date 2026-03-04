import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { UserRole, UserScope } from '@prisma/client'

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new UnauthorizedException('Authentication required')
    }

    // Enforce SUPER_ADMIN role and SYSTEM scope
    if (user.role !== UserRole.SUPER_ADMIN || user.scope !== UserScope.SYSTEM) {
      throw new UnauthorizedException('Access denied: SUPER_ADMIN privileges required')
    }

    return true
  }
}
