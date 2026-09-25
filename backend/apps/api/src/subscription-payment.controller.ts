import {
  Controller,
  Logger,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'
import { PaystackService } from '../../../libs/payments/paystack.service'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'
import { SubscriptionsService } from '../../../libs/billing/subscriptions.service'
import { TrialService, TRIAL_CARD_CHECK_KOBO, TRIAL_DURATION_DAYS } from '../../../libs/billing/trial.service'

@Controller()
@UseGuards(JwtAuthGuard)
export class SubscriptionPaymentController {
  private readonly logger = new Logger(SubscriptionPaymentController.name)

  constructor(
    private readonly prisma: PrismaClient,
    private readonly paystack: PaystackService,
    private readonly configLoader: ConfigLoaderService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly trialService: TrialService,
  ) {}

  /** Resolve Paystack from DB-stored key so admin changes take effect without restart */
  private async getPaystack(): Promise<PaystackService> {
    const key = await this.configLoader.getPaystackSecret()
    return key ? new PaystackService(key) : this.paystack
  }

  /**
   * GET /api/subscription/payment/status
   * Returns the tenant's current subscription status, plan details, and onboarding step.
   * Used by the onboarding page to resume at the correct step.
   */
  @Get('api/subscription/payment/status')
  async getStatus(@CurrentUser() user: any) {
    if (!user?.tenant_id) throw new UnauthorizedException()

    const [subscription, tenant] = await Promise.all([
      this.prisma.subscription.findUnique({ where: { tenant_id: user.tenant_id } }),
      this.prisma.tenant.findUnique({ where: { id: user.tenant_id } }),
    ])

    if (!subscription) throw new BadRequestException('No subscription found')

    const plan = await this.subscriptionsService.lookupPlan(subscription.plan_tier)

    let theme: Record<string, unknown> = {}
    try { theme = JSON.parse(tenant?.theme ?? '{}') } catch { /* ignore */ }

    return {
      subscriptionStatus: subscription.status,
      planTier: subscription.plan_tier,
      planName: plan.name,
      amountKobo: plan.priceKobo,
      trialEligible: this.trialService.isEligible(subscription),
      trialDays: TRIAL_DURATION_DAYS,
      cardCheckKobo: TRIAL_CARD_CHECK_KOBO,
      onboardingStep: (theme.onboardingStep as string) ?? null,
      onboardingCompleted: theme.onboardingCompleted === true,
    }
  }

  /**
   * POST /api/onboarding/step
   * Persists the current onboarding step so the user can resume correctly on page reload.
   */
  @Post('api/onboarding/step')
  async saveOnboardingStep(@CurrentUser() user: any, @Body() body: { step: string }) {
    if (!user?.tenant_id) throw new UnauthorizedException()
    const allowed = ['payment', 'profile', 'whatsapp', 'done']
    if (!allowed.includes(body?.step)) throw new BadRequestException('Invalid step value')

    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenant_id } })
    let theme: Record<string, unknown> = {}
    try { theme = JSON.parse(tenant?.theme ?? '{}') } catch { /* ignore */ }

    await this.prisma.tenant.update({
      where: { id: user.tenant_id },
      data: { theme: JSON.stringify({ ...theme, onboardingStep: body.step }) },
    })

    return { success: true }
  }

  /**
   * POST /api/subscription/payment/initialize
   * Calls Paystack to create a transaction for the subscription amount.
   * Returns the authorization URL to redirect the user to Paystack checkout.
   *
   * Body (optional): { newPlanTier: 'starter' | 'growth' | 'enterprise' }
   * When newPlanTier is provided this is a plan upgrade — the invoice is tagged
   * with the target tier so that verify() can apply the change after payment.
   */
  @Post('api/subscription/payment/initialize')
  async initializePayment(
    @CurrentUser() user: any,
    @Body() body: { newPlanTier?: string; platform?: string; startTrial?: boolean } = {},
  ) {
    if (!user?.tenant_id) throw new UnauthorizedException()

    const subscription = await this.prisma.subscription.findUnique({
      where: { tenant_id: user.tenant_id },
    })

    if (!subscription) throw new BadRequestException('No subscription found')

    if (body.startTrial) {
      return this.initializeTrialCardCheck(user, subscription, body.platform)
    }

    const { newPlanTier } = body
    const validTiers = ['starter', 'growth', 'enterprise']

    // Determine which plan we are paying for
    let targetTier = subscription.plan_tier
    let isUpgrade = false

    if (newPlanTier) {
      if (!validTiers.includes(newPlanTier)) {
        throw new BadRequestException('Invalid plan tier. Must be starter, growth, or enterprise.')
      }
      if (newPlanTier === subscription.plan_tier && subscription.status === 'active') {
        throw new BadRequestException('You are already on this plan.')
      }
      targetTier = newPlanTier
      isUpgrade = true
    } else {
      // Initial activation — subscription must not already be active
      if (subscription.status === 'active') {
        return { already_paid: true }
      }
    }

    // JWT payload only contains sub/role/tenant_id — fetch email from DB
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { email: true } })
    if (!dbUser?.email) throw new BadRequestException('User record not found')

    const plan = await this.subscriptionsService.lookupPlan(targetTier)
    const reference = `sub-${user.tenant_id.slice(0, 8)}-${Date.now()}`

    const dashboardUrl = (await this.configLoader.get('NEXT_PUBLIC_DASHBOARD_URL'))
      || process.env.NEXT_PUBLIC_DASHBOARD_URL
    if (!dashboardUrl) {
      throw new BadRequestException('NEXT_PUBLIC_DASHBOARD_URL is not configured. Set it in System Config or environment.')
    }
    // Upgrade payments return to the subscription page; initial activation to onboarding
    // Mobile clients pass platform=mobile to get a deep-link callback instead
    let callbackUrl: string
    if (body.platform === 'mobile') {
      callbackUrl = isUpgrade
        ? 'raven://payment-callback?type=upgrade'
        : 'raven://payment-callback'
    } else {
      callbackUrl = isUpgrade
        ? `${dashboardUrl}/subscription/payment-callback`
        : `${dashboardUrl}/onboarding/payment-callback`
    }

    if (isUpgrade) {
      // For upgrades, create a fresh invoice (no upsert — each upgrade is its own record)
      await this.prisma.invoice.create({
        data: {
          tenant_id: user.tenant_id,
          plan: targetTier,    // stores the TARGET tier — verify() reads this
          period: new Date().toISOString().slice(0, 7),
          amount: plan.priceKobo / 100,
          status: 'pending',
          reference,
        },
      })
    } else {
      // Initial activation — upsert the single pending invoice
      await this.prisma.invoice.upsert({
        where: { id: `pending-${user.tenant_id}` },
        create: {
          id: `pending-${user.tenant_id}`,
          tenant_id: user.tenant_id,
          plan: targetTier,
          period: new Date().toISOString().slice(0, 7),
          amount: plan.priceKobo / 100,
          status: 'pending',
          reference,
        },
        update: {
          reference,
          status: 'pending',
          amount: plan.priceKobo / 100,
          plan: targetTier,
        },
      })
    }

    const paystack = await this.getPaystack()
    const result = await paystack.initialize(plan.priceKobo, dbUser.email, reference, callbackUrl)

    return {
      authorizationUrl: result.data.authorization_url,
      accessCode: result.data.access_code,
      reference,
      planName: plan.name,
      amountKobo: plan.priceKobo,
    }
  }

  /**
   * GET /api/subscription/payment/verify?reference=xxx
   * Verifies the Paystack transaction and activates the subscription on success.
   * If the associated invoice targets a different plan tier (upgrade/downgrade),
   * the subscription plan is updated atomically with activation.
   */
  @Get('api/subscription/payment/verify')
  async verifyPayment(
    @Query('reference') reference: string,
    @CurrentUser() user: any,
  ) {
    if (!user?.tenant_id) throw new UnauthorizedException()
    if (!reference?.trim()) throw new BadRequestException('reference is required')

    const paystack = await this.getPaystack()
    const result = await paystack.verify(reference)

    if (result?.data?.status !== 'success') {
      return { success: false, status: result?.data?.status ?? 'unknown' }
    }

    if (reference.startsWith('trial-')) {
      return this.completeTrialCardCheck(user.tenant_id, reference, result.data, paystack)
    }

    // Fetch the invoice to determine the target plan
    const invoice = await this.prisma.invoice.findFirst({
      where: { tenant_id: user.tenant_id, reference },
    })

    const currentSubscription = await this.prisma.subscription.findUnique({
      where: { tenant_id: user.tenant_id },
    })

    const targetTier = invoice?.plan ?? currentSubscription?.plan_tier ?? 'starter'
    const isUpgrade = currentSubscription && targetTier !== currentSubscription.plan_tier
    const newPlan = await this.subscriptionsService.lookupPlan(targetTier)

    if (currentSubscription && currentSubscription.status !== 'active') {
      // Activation from pending / trial / past_due / cancelled: start a fresh paid period
      // so the renewal job doesn't see an already-elapsed period and charge again.
      const now = new Date()
      await this.prisma.subscription.update({
        where: { tenant_id: user.tenant_id },
        data: {
          status: 'active',
          plan_tier: targetTier,
          conversations_limit: newPlan.conversationsLimit,
          conversations_used: 0,
          current_period_start: now,
          current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          cancel_at_period_end: false,
          last_charge_error: null,
          ...(currentSubscription.status === 'trial' ? { trial_converted_at: now } : {}),
        },
      })
    } else if (isUpgrade) {
      // Mid-period upgrade: update tier + conversations_limit
      await this.prisma.subscription.update({
        where: { tenant_id: user.tenant_id },
        data: {
          status: 'active',
          plan_tier: targetTier,
          conversations_limit: newPlan.conversationsLimit,
        },
      })
    }

    // Mark the invoice as paid
    await this.prisma.invoice.updateMany({
      where: { tenant_id: user.tenant_id, reference },
      data: { status: 'paid' },
    })

    if (!isUpgrade) {
      // Advance the onboarding step only for initial activation
      const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenant_id } })
      let theme: Record<string, unknown> = {}
      try { theme = JSON.parse(tenant?.theme ?? '{}') } catch { /* ignore */ }

      await this.prisma.tenant.update({
        where: { id: user.tenant_id },
        data: { theme: JSON.stringify({ ...theme, onboardingStep: 'profile' }) },
      })
    }

    return { success: true, isUpgrade, newPlanTier: isUpgrade ? targetTier : undefined }
  }

  /**
   * POST /api/onboarding/complete
   * Marks the onboarding as fully completed. Called when user clicks "Go to dashboard".
   */
  @Post('api/onboarding/complete')
  async completeOnboarding(@CurrentUser() user: any) {
    if (!user?.tenant_id) throw new UnauthorizedException()

    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenant_id } })
    let theme: Record<string, unknown> = {}
    try { theme = JSON.parse(tenant?.theme ?? '{}') } catch { /* ignore */ }

    await this.prisma.tenant.update({
      where: { id: user.tenant_id },
      data: { theme: JSON.stringify({ ...theme, onboardingCompleted: true }) },
    })

    return { success: true }
  }

  /**
   * GET /api/subscription/trial/status
   * Trial state for the dashboard banner: days left, the plan that will be
   * billed, the saved card, and whether auto-renew has been turned off.
   */
  @Get('api/subscription/trial/status')
  async getTrialStatus(@CurrentUser() user: any) {
    if (!user?.tenant_id) throw new UnauthorizedException()
    return this.trialService.getTrialStatus(user.tenant_id)
  }

  /**
   * POST /api/subscription/cancel   { cancel?: boolean }
   * Turn automatic billing off (default) or back on. The account keeps working
   * until the end of the current trial or paid period.
   */
  @Post('api/subscription/cancel')
  async setCancelAtPeriodEnd(@CurrentUser() user: any, @Body() body: { cancel?: boolean } = {}) {
    if (!user?.tenant_id) throw new UnauthorizedException()
    return this.trialService.setCancelAtPeriodEnd(user.tenant_id, body.cancel !== false)
  }

  /**
   * Card-up-front trial, step 1: a small card-only charge that yields a reusable
   * authorization. It is refunded as soon as it is verified.
   */
  private async initializeTrialCardCheck(user: any, subscription: any, platform?: string) {
    if (!this.trialService.isEligible(subscription)) {
      throw new BadRequestException('This account is not eligible for a free trial')
    }

    const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { email: true } })
    if (!dbUser?.email) throw new BadRequestException('User record not found')

    const dashboardUrl = (await this.configLoader.get('NEXT_PUBLIC_DASHBOARD_URL'))
      || process.env.NEXT_PUBLIC_DASHBOARD_URL
    if (!dashboardUrl) {
      throw new BadRequestException('NEXT_PUBLIC_DASHBOARD_URL is not configured. Set it in System Config or environment.')
    }
    const callbackUrl = platform === 'mobile'
      ? 'raven://payment-callback?type=trial'
      : `${dashboardUrl}/onboarding/payment-callback`

    const reference = `trial-${user.tenant_id.slice(0, 8)}-${Date.now()}`
    const paystack = await this.getPaystack()
    const result = await paystack.initialize(TRIAL_CARD_CHECK_KOBO, dbUser.email, reference, callbackUrl, {
      channels: ['card'],
      metadata: { tenant_id: user.tenant_id, purpose: 'trial_card_check' },
    })

    const plan = await this.subscriptionsService.lookupPlan(subscription.plan_tier)
    return {
      mode: 'trial',
      authorizationUrl: result.data.authorization_url,
      accessCode: result.data.access_code,
      reference,
      planName: plan.name,
      amountKobo: TRIAL_CARD_CHECK_KOBO,
      trialDays: TRIAL_DURATION_DAYS,
    }
  }

  /** Card-up-front trial, step 2: save the reusable card, start the trial, refund the check. */
  private async completeTrialCardCheck(tenantId: string, reference: string, tx: any, paystack: PaystackService) {
    if (tx?.metadata?.tenant_id !== tenantId) {
      throw new BadRequestException('This payment does not belong to your account')
    }

    const subscription = await this.prisma.subscription.findUnique({ where: { tenant_id: tenantId } })
    if (subscription?.status === 'trial' && subscription.trial_started_at) {
      // Callback page reloaded — trial already started from this card
      return { success: true, isTrial: true, trialEndsAt: subscription.trial_ends_at }
    }

    const auth = tx?.authorization
    if (!auth?.authorization_code || auth.reusable !== true) {
      await paystack.refund(reference).catch(err => this.logger.warn(`Trial card-check refund failed for ${reference}: ${err}`))
      return {
        success: false,
        status: 'card_not_reusable',
        message: 'This card cannot be used for automatic billing. Please try a different debit or credit card.',
      }
    }

    const trial = await this.trialService.startTrialWithCard(tenantId, {
      authorizationCode: auth.authorization_code,
      last4: auth.last4,
      brand: auth.card_type ?? auth.brand,
      email: tx.customer?.email,
    })

    await paystack.refund(reference).catch(err => this.logger.warn(`Trial card-check refund failed for ${reference}: ${err}`))

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
    let theme: Record<string, unknown> = {}
    try { theme = JSON.parse(tenant?.theme ?? '{}') } catch { /* ignore */ }
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { theme: JSON.stringify({ ...theme, onboardingStep: 'profile' }) },
    })

    return { success: true, isTrial: true, trialEndsAt: trial.trialEndsAt }
  }
}
