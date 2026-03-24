import { Body, Controller, Get, HttpCode, HttpStatus, Post, UnauthorizedException, UseGuards } from '@nestjs/common'
import { PrismaClient, UserScope } from '@prisma/client'
import { AuthService } from '../../../libs/auth/services/auth.service'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'
import { StaffScopeService } from '../../../libs/auth/staff.scope.service'

interface LoginDto {
  email: string
  password: string
}

@Controller('api/auth')
export class TenantAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaClient,
    private readonly staffScopeService: StaffScopeService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    const { email, password } = body

    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required')
    }

    const user = await this.authService.validateUser(email, password)
    if (user.scope !== UserScope.TENANT || !user.tenant_id) {
      throw new UnauthorizedException('Tenant credentials required')
    }

    const { access_token } = await this.authService.login(user)

    // Check if onboarding is completed by reading tenant theme
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenant_id } })
    let onboardingCompleted = false
    try {
      const theme = JSON.parse(tenant?.theme ?? '{}')
      onboardingCompleted = theme?.onboardingCompleted === true
    } catch { /* ignore */ }

    return {
      access_token,
      onboarding_completed: onboardingCompleted,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        scope: user.scope,
        tenant_id: user.tenant_id,
      },
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: any) {
    if (user.scope !== UserScope.TENANT || !user.tenant_id) {
      throw new UnauthorizedException('Tenant credentials required')
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id ?? user.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        scope: true,
        tenant_id: true,
        created_at: true,
      },
    })

    if (!dbUser) {
      throw new UnauthorizedException('User not found')
    }

    const branchIds = dbUser.role === 'staff'
      ? await this.staffScopeService.getAssignedBranches(dbUser.id)
      : []

    return {
      ...dbUser,
      branch_ids: branchIds,
    }
  }
}