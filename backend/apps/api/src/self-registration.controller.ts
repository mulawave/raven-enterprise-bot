import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'
import { TenantProvisionService } from '../admin/onboarding/tenant.provision.service'
import { SubscriptionsService, PlanTier } from '../../../libs/billing/subscriptions.service'
import { AuthService } from '../../../libs/auth/services/auth.service'
import { EmailService } from '../../../libs/email/email.service'

const PENDING_REG_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface RegisterDto {
  name: string
  email: string
  password: string
  planTier?: 'starter' | 'growth' | 'enterprise'
}

@Controller('api/auth')
export class SelfRegistrationController {
  private readonly logger = new Logger(SelfRegistrationController.name)

  constructor(
    private readonly prisma: PrismaClient,
    private readonly provisionService: TenantProvisionService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * GET /api/auth/check-email?email=XXX
   * Lightweight availability check — returns 200 { available: true } or
   * 200 { available: false } so the client can show inline feedback before
   * the user reaches the plan-selection step.
   */
  @Get('check-email')
  @HttpCode(HttpStatus.OK)
  async checkEmail(@Query('email') email: string) {
    if (!email?.trim()) {
      return { available: false }
    }
    const emailLower = email.trim().toLowerCase()
    const existing = await this.prisma.user.findFirst({ where: { email: emailLower } })
    if (existing) return { available: false, reason: 'account' }

    const pending = await this.prisma.systemConfig.findFirst({
      where: { key: { startsWith: 'PENDING_REG_' }, value: { contains: emailLower } },
    })
    if (pending) return { available: false, reason: 'pending' }

    return { available: true }
  }

  /**
   * POST /api/auth/register
   * Public self-service registration. Stores a pending registration token and
   * sends an email confirmation link. No tenant is created yet.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto) {
    const { name, email, password, planTier = 'starter' } = body

    if (!name?.trim() || !email?.trim() || !password) {
      throw new BadRequestException('name, email, and password are required')
    }

    const emailLower = email.trim().toLowerCase()

    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters')
    }

    // Check for existing user with this email
    const existing = await this.prisma.user.findFirst({ where: { email: emailLower } })
    if (existing) {
      throw new ConflictException('An account with this email already exists')
    }

    // Check for an in-flight pending registration
    const existingPending = await this.prisma.systemConfig.findFirst({
      where: { key: { startsWith: 'PENDING_REG_' }, value: { contains: emailLower } },
    })
    if (existingPending) {
      throw new ConflictException('A confirmation email was already sent to this address')
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + PENDING_REG_TTL_MS).toISOString()

    const payload = JSON.stringify({ name: name.trim(), email: emailLower, password, planTier, expiresAt })

    await this.prisma.systemConfig.create({
      data: {
        key: `PENDING_REG_${token}`,
        value: payload,
        description: `Pending tenant registration for ${emailLower}`,
        group: 'pending_registration',
        is_secret: true,
      },
    })

    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'https://app.raven-ai.online'
    const confirmUrl = `${dashboardUrl}/confirm-email?token=${token}`

    try {
      await this.emailService.send({
        to: emailLower,
        subject: 'Confirm your Raven account',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0f172a;color:#f1f5f9;border-radius:12px">
            <div style="margin-bottom:24px">
              <span style="font-size:24px;font-weight:700;color:#34d399">Raven</span>
              <span style="font-size:14px;color:#64748b;margin-left:8px">Enterprise Bot</span>
            </div>
            <h1 style="font-size:20px;font-weight:600;margin:0 0 12px">Welcome, ${name.trim()}!</h1>
            <p style="color:#94a3b8;margin:0 0 24px;line-height:1.6">
              You're one click away from activating your Raven account. Confirm your
              email address to continue setting up your AI-powered business assistant.
            </p>
            <a href="${confirmUrl}"
               style="display:inline-block;background:#10b981;color:#fff;font-weight:600;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px">
              Confirm my email →
            </a>
            <p style="color:#475569;font-size:12px;margin-top:32px">
              This link expires in 24 hours. If you didn't sign up, you can safely ignore this email.
            </p>
          </div>`,
      })
    } catch (err) {
      this.logger.error(`Failed to send confirmation email to ${emailLower}: ${err}`)
      // Don't expose internal email errors — the token is stored, user can request resend later
    }

    return { message: 'Confirmation email sent. Please check your inbox.' }
  }

  /**
   * GET /api/auth/confirm-email?token=XXX
   * Validates the confirmation token, provisions the tenant atomically,
   * and returns a JWT so the client can enter the onboarding wizard.
   */
  @Get('confirm-email')
  async confirmEmail(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Confirmation token is required')
    }

    const configEntry = await this.prisma.systemConfig.findUnique({
      where: { key: `PENDING_REG_${token}` },
    })

    if (!configEntry?.value) {
      throw new UnauthorizedException('Invalid or expired confirmation link')
    }

    let pending: { name: string; email: string; password: string; planTier: string; expiresAt: string }
    try {
      pending = JSON.parse(configEntry.value)
    } catch {
      throw new BadRequestException('Malformed registration data')
    }

    if (new Date(pending.expiresAt) < new Date()) {
      await this.prisma.systemConfig.delete({ where: { key: `PENDING_REG_${token}` } })
      throw new UnauthorizedException('Confirmation link has expired. Please register again.')
    }

    // Guard against race condition: check again just before provisioning
    const duplicate = await this.prisma.user.findFirst({ where: { email: pending.email } })
    if (duplicate) {
      await this.prisma.systemConfig.delete({ where: { key: `PENDING_REG_${token}` } })
      throw new ConflictException('An account with this email already exists')
    }

    // Provision the tenant
    const result = await this.provisionService.provision({
      tenantName: pending.name,
      owner: { email: pending.email, password: pending.password },
      staff: {
        email: `staff-${Date.now()}@temp.local`,
        password: crypto.randomBytes(16).toString('hex'),
      },
    })

    await this.subscriptionsService.createSubscription(
      result.tenant.id,
      pending.planTier as PlanTier,
    )

    // Mark onboarding as in-progress in the tenant's theme JSON
    await this.prisma.tenant.update({
      where: { id: result.tenant.id },
      data: {
        theme: JSON.stringify({
          onboardingStep: 'plan_selected',
          selectedPlan: pending.planTier,
          onboarding: {
            whatsappSet: false,
            catalogueSet: false,
            faqsSet: false,
            firstMessageSent: false,
            orderingSet: false,
          },
        }),
      },
    })

    // Clean up pending registration
    await this.prisma.systemConfig.delete({ where: { key: `PENDING_REG_${token}` } })

    // Issue JWT
    const { access_token } = await this.authService.login(result.owner)

    // Send welcome email (non-blocking)
    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'https://app.raven-ai.online'
    this.emailService.send({
      to: pending.email,
      subject: '🎉 Your Raven account is ready!',
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0f172a;color:#f1f5f9;border-radius:12px">
          <div style="margin-bottom:24px">
            <span style="font-size:24px;font-weight:700;color:#34d399">Raven</span>
            <span style="font-size:14px;color:#64748b;margin-left:8px">Enterprise Bot</span>
          </div>
          <h1 style="font-size:20px;font-weight:600;margin:0 0 12px">You're in, ${pending.name}!</h1>
          <p style="color:#94a3b8;margin:0 0 16px;line-height:1.6">
            Your <strong style="color:#34d399">${pending.planTier}</strong> account has been activated.
            Complete the short onboarding to connect your WhatsApp, upload your catalogue, and go live.
          </p>
          <a href="${dashboardUrl}/onboarding"
             style="display:inline-block;background:#10b981;color:#fff;font-weight:600;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px">
            Complete onboarding →
          </a>
          <p style="color:#475569;font-size:12px;margin-top:32px">
            Your login: <strong>${pending.email}</strong>
          </p>
        </div>`,
    }).catch(err => this.logger.error(`Welcome email failed: ${err}`))

    return {
      access_token,
      user: {
        id: result.owner.id,
        email: result.owner.email,
        name: result.owner.name,
        role: result.owner.role,
        tenant_id: result.tenant.id,
      },
      onboarding_step: 'profile',
    }
  }
}
