import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UserService } from './user.service'
import { User } from '@prisma/client'

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User> {
    const user = await this.userService.findByEmail(email)
    if (!user) throw new UnauthorizedException()
    const valid = await this.userService.comparePassword(pass, user.password)
    if (!valid) throw new UnauthorizedException()
    // Only admin-level roles may obtain a JWT from this service
    const adminRoles = ['SUPER_ADMIN', 'admin', 'owner', 'staff'] as const
    if (!adminRoles.includes(user.role as (typeof adminRoles)[number])) throw new UnauthorizedException()
    return user
  }

  async login(user: User): Promise<{ access_token: string }> {
    const payload: Record<string, unknown> = { sub: user.id, role: user.role }
    if (user.role !== 'SUPER_ADMIN') payload.tenant_id = user.tenant_id
    return { access_token: this.jwtService.sign(payload) }
  }
}
