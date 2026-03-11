import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const authHeader = request?.headers?.authorization

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Unauthorized')
    }

    const [type, token] = authHeader.split(' ')
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Unauthorized')
    }

    try {
      const payload = this.jwtService.verify(token) as Record<string, unknown>
      request.user = {
        ...payload,
        id: (payload.sub as string | undefined) ?? (payload.id as string | undefined),
      }
      return true
    } catch {
      throw new UnauthorizedException('Unauthorized')
    }
  }
}
