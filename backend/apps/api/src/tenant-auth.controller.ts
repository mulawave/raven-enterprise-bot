import { Body, Controller, Get, HttpCode, HttpStatus, Post, UnauthorizedException, UseGuards } from '@nestjs/common'
import { PrismaClient, UserScope } from '@prisma/client'
import * as crypto from 'crypto'
import { AuthService } from '../../../libs/auth/services/auth.service'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'
import { StaffScopeService } from '../../../libs/auth/staff.scope.service'
import { EmailService } from '../../../libs/email/email.service'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'

const PENDING_REG_TTL_MS = 24 * 60 * 60 * 1000

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
    private readonly emailService: EmailService,
    private readonly configLoader: ConfigLoaderService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    const { email, password } = body

    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required')
    }

    // Try normal auth first
    let user: any
    try {
      user = await this.authService.validateUser(email, password)
    } catch {
      // Auth failed — check for pending registration before throwing
      const emailLower = email.trim().toLowerCase()
      const pendingEntry = await this.prisma.systemConfig.findFirst({
        where: { key: { startsWith: 'PENDING_REG_' }, value: { contains: emailLower } },
      })

      if (pendingEntry?.value) {
        try {
          const pending = JSON.parse(pendingEntry.value)
          if (pending.email === emailLower) {
            const isExpired = new Date(pending.expiresAt) < new Date()

            if (isExpired) {
              // Expired: recreate with fresh token/code/TTL and send new email
              await this.prisma.systemConfig.delete({ where: { key: pendingEntry.key } })
              const token = crypto.randomBytes(32).toString('hex')
              const code = String(crypto.randomInt(100000, 999999))
              const expiresAt = new Date(Date.now() + PENDING_REG_TTL_MS).toISOString()
              const newPayload = { ...pending, expiresAt, confirmCode: code, lastResentAt: new Date().toISOString() }

              await this.prisma.systemConfig.create({
                data: {
                  key: `PENDING_REG_${token}`,
                  value: JSON.stringify(newPayload),
                  description: `Pending tenant registration for ${emailLower}`,
                  group: 'pending_registration',
                  is_secret: true,
                },
              })

              // Send fresh confirmation email
              const dashboardUrl = (await this.configLoader.get('NEXT_PUBLIC_DASHBOARD_URL'))
                || process.env.NEXT_PUBLIC_DASHBOARD_URL
              if (dashboardUrl) {
                const confirmUrl = `${dashboardUrl}/confirm-email?token=${token}`
                this.emailService.send({
                  to: emailLower,
                  subject: 'Confirm your Raven account',
                  html: this.buildConfirmationEmail(pending.name, confirmUrl, code),
                }).catch(() => {})
              }

              return { expired_verification: true, email: emailLower }
            }

            // Not expired: return pending flag (CheckEmailScreen will auto-resend on mount)
            return { pending_verification: true, email: emailLower }
          }
        } catch { /* JSON parse failed — treat as not found */ }
      }

      throw new UnauthorizedException('Invalid tenant credentials')
    }

    if (user.scope !== UserScope.TENANT || !user.tenant_id) {
      throw new UnauthorizedException('Tenant credentials required')
    }

    const { access_token } = await this.authService.login(user)

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

  /** Build dual-mode confirmation email (same template as SelfRegistrationController) */
  private buildConfirmationEmail(name: string, confirmUrl: string, code: string): string {
    return `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0f172a;color:#f1f5f9;border-radius:12px">
        <div style="margin-bottom:24px">
          <span style="font-size:24px;font-weight:700;color:#34d399">Raven</span>
          <span style="font-size:14px;color:#64748b;margin-left:8px">Enterprise Bot</span>
        </div>
        <h1 style="font-size:20px;font-weight:600;margin:0 0 12px">Welcome, ${name}!</h1>
        <p style="color:#94a3b8;margin:0 0 24px;line-height:1.6">
          You're one step away from activating your Raven account. Confirm your
          email address to continue setting up your AI-powered business assistant.
        </p>
        <p style="color:#e2e8f0;font-size:14px;font-weight:600;margin:0 0 12px">
          If you're using Raven from your browser, click the button below:
        </p>
        <a href="${confirmUrl}"
           style="display:inline-block;background:#10b981;color:#fff;font-weight:600;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px">
          Confirm my email &rarr;
        </a>
        <div style="border-top:1px solid #334155;margin:28px 0;padding-top:20px">
          <p style="color:#e2e8f0;font-size:14px;font-weight:600;margin:0 0 12px">
            If you're using the Raven mobile app, enter this code:
          </p>
          <div style="background:#1e293b;border-radius:8px;padding:16px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#34d399;font-family:monospace">
            ${code}
          </div>
        </div>
        <p style="color:#475569;font-size:12px;margin-top:32px">
          This link and code expire in 24 hours. If you didn't sign up, you can safely ignore this email.
        </p>
      </div>`
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