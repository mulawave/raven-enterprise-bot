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
import { NotificationService } from '../../../libs/notifications/notification.service'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'

const PENDING_REG_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const RESEND_COOLDOWN_MS = 60 * 1000 // 60 seconds

interface RegisterDto {
  name: string
  email: string
  password: string
  planTier?: 'starter' | 'growth' | 'enterprise'
}

interface PendingPayload {
  name: string
  email: string
  password: string
  planTier: string
  expiresAt: string
  confirmCode: string
  lastResentAt: string | null
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
    private readonly notificationService: NotificationService,
    private readonly configLoader: ConfigLoaderService,
  ) {}

  private async resolveDashboardUrl(): Promise<string> {
    const dashboardUrl = (await this.configLoader.get('NEXT_PUBLIC_DASHBOARD_URL'))
      || process.env.NEXT_PUBLIC_DASHBOARD_URL

    if (!dashboardUrl) {
      throw new BadRequestException('NEXT_PUBLIC_DASHBOARD_URL is not configured. Set it in System Config or environment.')
    }

    return dashboardUrl
  }

  /** Generate a 6-digit numeric confirmation code */
  private generateConfirmCode(): string {
    return String(crypto.randomInt(100000, 999999))
  }

  /** Build the dual-mode confirmation email (web link + mobile code) */
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

  /** Send the confirmation email (fire-and-forget, logs failures) */
  async sendConfirmationEmail(email: string, name: string, token: string, code: string): Promise<void> {
    const dashboardUrl = await this.resolveDashboardUrl()
    const confirmUrl = `${dashboardUrl}/confirm-email?token=${token}`
    try {
      await this.emailService.send({
        to: email,
        subject: 'Confirm your Raven account',
        html: this.buildConfirmationEmail(name, confirmUrl, code),
      })
    } catch (err) {
      this.logger.error(`Failed to send confirmation email to ${email}: ${err}`)
    }
  }

  /** Find a PENDING_REG_ entry by email address */
  async findPendingByEmail(email: string): Promise<{ key: string; pending: PendingPayload } | null> {
    const entry = await this.prisma.systemConfig.findFirst({
      where: { key: { startsWith: 'PENDING_REG_' }, value: { contains: email } },
    })
    if (!entry?.value) return null
    try {
      const pending: PendingPayload = JSON.parse(entry.value)
      if (pending.email !== email) return null
      return { key: entry.key, pending }
    } catch {
      return null
    }
  }

  /** Create or recreate a pending registration entry. Returns { token, code }. */
  async createPendingEntry(name: string, email: string, password: string, planTier: string): Promise<{ token: string; code: string }> {
    const token = crypto.randomBytes(32).toString('hex')
    const code = this.generateConfirmCode()
    const expiresAt = new Date(Date.now() + PENDING_REG_TTL_MS).toISOString()
    const payload: PendingPayload = { name, email, password, planTier, expiresAt, confirmCode: code, lastResentAt: null }

    await this.prisma.systemConfig.create({
      data: {
        key: `PENDING_REG_${token}`,
        value: JSON.stringify(payload),
        description: `Pending tenant registration for ${email}`,
        group: 'pending_registration',
        is_secret: true,
      },
    })
    return { token, code }
  }

  /**
   * Shared provisioning logic — provisions tenant, creates subscription,
   * sets onboarding state, cleans up pending entry, notifies admins, returns JWT.
   */
  private async provisionFromPending(configKey: string, pending: PendingPayload) {
    // Guard against race condition: check again just before provisioning
    const duplicate = await this.prisma.user.findFirst({ where: { email: pending.email } })
    if (duplicate) {
      await this.prisma.systemConfig.delete({ where: { key: configKey } })
      throw new ConflictException('An account with this email already exists')
    }

    const result = await this.provisionService.provision({
      tenantName: pending.name,
      owner: { email: pending.email, password: pending.password, name: pending.name },
      staff: {
        email: `staff-${Date.now()}@temp.local`,
        password: crypto.randomBytes(16).toString('hex'),
      },
    })

    await this.subscriptionsService.createSubscription(
      result.tenant.id,
      pending.planTier as PlanTier,
      'pending_payment',
    )

    await this.prisma.tenant.update({
      where: { id: result.tenant.id },
      data: {
        theme: JSON.stringify({
          onboardingStep: 'payment',
          selectedPlan: pending.planTier,
          onboardingCompleted: false,
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

    await this.prisma.systemConfig.delete({ where: { key: configKey } })

    this.notificationService.send({
      toAdmins: true,
      title: '🎉 New Tenant Registered',
      body: `${pending.name} (${pending.email}) signed up on the ${pending.planTier} plan.`,
      type: 'new_tenant',
      data: { tenantId: result.tenant.id, tenantName: pending.name, email: pending.email, plan: pending.planTier },
    }).catch(() => undefined)

    const { access_token } = await this.authService.login(result.owner)

    const dashboardUrl = await this.resolveDashboardUrl()
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
            Complete onboarding &rarr;
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
    const existingPending = await this.findPendingByEmail(emailLower)
    if (existingPending) {
      // If expired, clean up and allow re-registration
      if (new Date(existingPending.pending.expiresAt) < new Date()) {
        await this.prisma.systemConfig.delete({ where: { key: existingPending.key } })
      } else {
        throw new ConflictException('A confirmation email was already sent to this address')
      }
    }

    const { token, code } = await this.createPendingEntry(name.trim(), emailLower, password, planTier)

    await this.sendConfirmationEmail(emailLower, name.trim(), token, code)

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

    let pending: PendingPayload
    try {
      pending = JSON.parse(configEntry.value)
    } catch {
      throw new BadRequestException('Malformed registration data')
    }

    if (new Date(pending.expiresAt) < new Date()) {
      await this.prisma.systemConfig.delete({ where: { key: `PENDING_REG_${token}` } })
      throw new UnauthorizedException('Confirmation link has expired. Please register again.')
    }

    return this.provisionFromPending(`PENDING_REG_${token}`, pending)
  }

  /**
   * POST /api/auth/confirm-by-code
   * Mobile-friendly confirmation using a 6-digit code instead of the URL token.
   * Accepts { email, code }, finds the pending registration, validates the code,
   * then provisions exactly like confirmEmail().
   */
  @Post('confirm-by-code')
  @HttpCode(HttpStatus.OK)
  async confirmByCode(@Body() body: { email: string; code: string }) {
    const { email, code } = body
    if (!email?.trim() || !code?.trim()) {
      throw new BadRequestException('email and code are required')
    }

    const emailLower = email.trim().toLowerCase()
    const found = await this.findPendingByEmail(emailLower)

    if (!found) {
      throw new UnauthorizedException('No pending registration found for this email')
    }

    if (new Date(found.pending.expiresAt) < new Date()) {
      await this.prisma.systemConfig.delete({ where: { key: found.key } })
      throw new UnauthorizedException('Confirmation code has expired. Please register again.')
    }

    if (found.pending.confirmCode !== code.trim()) {
      throw new BadRequestException('Invalid confirmation code')
    }

    return this.provisionFromPending(found.key, found.pending)
  }

  /**
   * POST /api/auth/resend-confirmation
   * Resends the confirmation email for a pending registration.
   * Rate-limited to once per 60 seconds. Expired entries are recreated.
   * Returns generic 200 for unknown emails (no enumeration leak).
   */
  @Post('resend-confirmation')
  @HttpCode(HttpStatus.OK)
  async resendConfirmation(@Body() body: { email: string }) {
    const { email } = body
    if (!email?.trim()) {
      throw new BadRequestException('email is required')
    }

    const emailLower = email.trim().toLowerCase()
    const found = await this.findPendingByEmail(emailLower)

    if (!found) {
      // Generic 200 — don't reveal whether the email exists
      return { message: 'If a pending registration exists, a new confirmation email has been sent.' }
    }

    const isExpired = new Date(found.pending.expiresAt) < new Date()

    if (isExpired) {
      // Expired: delete old entry, create fresh one with new token + code + TTL
      await this.prisma.systemConfig.delete({ where: { key: found.key } })
      const { token, code } = await this.createPendingEntry(
        found.pending.name,
        found.pending.email,
        found.pending.password,
        found.pending.planTier,
      )
      await this.sendConfirmationEmail(emailLower, found.pending.name, token, code)
    } else {
      // Not expired: check cooldown
      if (found.pending.lastResentAt) {
        const elapsed = Date.now() - new Date(found.pending.lastResentAt).getTime()
        if (elapsed < RESEND_COOLDOWN_MS) {
          const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
          throw new BadRequestException(`Please wait ${waitSec} seconds before requesting another email`)
        }
      }

      // Update lastResentAt
      const updatedPayload: PendingPayload = { ...found.pending, lastResentAt: new Date().toISOString() }
      await this.prisma.systemConfig.update({
        where: { key: found.key },
        data: { value: JSON.stringify(updatedPayload) },
      })

      const token = found.key.replace('PENDING_REG_', '')
      await this.sendConfirmationEmail(emailLower, found.pending.name, token, found.pending.confirmCode)
    }

    return { message: 'If a pending registration exists, a new confirmation email has been sent.' }
  }
}
