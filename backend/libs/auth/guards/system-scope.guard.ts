import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { UserScope } from '@prisma/client'

@Injectable()
export class SystemScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new UnauthorizedException('Authentication required')
    }

    // Enforce SYSTEM scope
    if (user.scope !== UserScope.SYSTEM) {
      throw new UnauthorizedException('Access denied: SYSTEM scope required')
    }

    return true
  }
}
