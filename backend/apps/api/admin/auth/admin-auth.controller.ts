import { Controller, Post, Get, Body, HttpCode, HttpStatus, UnauthorizedException, UseGuards } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaClient, UserRole, UserScope } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../../libs/auth/decorators/current-user.decorator'

interface LoginDto {
  email: string
  password: string
}

interface AdminIdentity {
  id: string
  email: string
  role: UserRole
  scope: UserScope
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * POST /admin/auth/login
   * Authenticate SUPER_ADMIN only
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    const { email, password } = body

    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required')
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Verify user is SUPER_ADMIN with SYSTEM scope
    if (user.role !== UserRole.SUPER_ADMIN || user.scope !== UserScope.SYSTEM) {
      throw new UnauthorizedException('Access denied: Admin credentials required')
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Generate JWT with SYSTEM scope
    const payload = {
      sub: user.id,
      role: user.role,
      scope: user.scope,
    }

    const access_token = this.jwtService.sign(payload)

    const admin: AdminIdentity = {
      id: user.id,
      email: user.email,
      role: user.role,
      scope: user.scope,
    }

    return {
      access_token,
      admin,
    }
  }

  /**
   * GET /admin/auth/me
   * Get current admin identity
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: any) {
    // Verify this is a SUPER_ADMIN
    if (user.role !== UserRole.SUPER_ADMIN || user.scope !== UserScope.SYSTEM) {
      throw new UnauthorizedException('Access denied: Admin credentials required')
    }

    // Fetch fresh user data
    const admin = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        id: true,
        email: true,
        role: true,
        scope: true,
        created_at: true,
      },
    })

    if (!admin) {
      throw new UnauthorizedException('Admin user not found')
    }

    return admin
  }

  /**
   * POST /admin/auth/logout
   * Logout (stateless - client discards token)
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: any) {
    // Verify this is a SUPER_ADMIN
    if (user.role !== UserRole.SUPER_ADMIN || user.scope !== UserScope.SYSTEM) {
      throw new UnauthorizedException('Access denied: Admin credentials required')
    }

    // Stateless logout - client will discard token
    // Could add token blacklist here if needed
    return {
      success: true,
      message: 'Logged out successfully',
    }
  }
}
