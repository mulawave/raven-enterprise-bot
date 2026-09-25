import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { SubscriptionPaymentController } from './subscription-payment.controller'
import { PaystackService } from '../../../libs/payments/paystack.service'
import { TrialService, TRIAL_CARD_CHECK_KOBO } from '../../../libs/billing/trial.service'

describe('SubscriptionPaymentController', () => {
  const prisma = {
    subscription: { findUnique: jest.fn(), update: jest.fn() },
    tenant: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    invoice: { findFirst: jest.fn(), updateMany: jest.fn(), create: jest.fn(), upsert: jest.fn() },
  }
  const paystack = {
    initialize: jest.fn(),
    verify: jest.fn(),
    refund: jest.fn(),
  }
  const configLoader = {
    getPaystackSecret: jest.fn().mockResolvedValue(''),
    get: jest.fn().mockResolvedValue('https://dash.example.com'),
  }
  const subscriptionsService = {
    lookupPlan: jest.fn().mockResolvedValue({ name: 'Starter Plan', priceKobo: 4900000, conversationsLimit: 500, overagePriceKobo: 12000 }),
  }
  const trialService = new TrialService(prisma as any)

  const controller = new SubscriptionPaymentController(
    prisma as any,
    paystack as unknown as PaystackService,
    configLoader as any,
    subscriptionsService as any,
    trialService,
  )

  const user = { sub: 'user-1', tenant_id: 'tenant-1234567890' }
  const pendingSub = { tenant_id: user.tenant_id, status: 'pending_payment', plan_tier: 'starter', trial_started_at: null }

  beforeEach(() => {
    jest.clearAllMocks()
    configLoader.getPaystackSecret.mockResolvedValue('')
    configLoader.get.mockResolvedValue('https://dash.example.com')
    subscriptionsService.lookupPlan.mockResolvedValue({ name: 'Starter Plan', priceKobo: 4900000, conversationsLimit: 500, overagePriceKobo: 12000 })
    prisma.user.findUnique.mockResolvedValue({ email: 'owner@example.com' })
    prisma.tenant.findUnique.mockResolvedValue({ theme: '{}' })
    paystack.refund.mockResolvedValue({ status: true })
  })

  describe('trial card check', () => {
    it('initializes a card-only ₦50 check tagged with the tenant', async () => {
      prisma.subscription.findUnique.mockResolvedValue(pendingSub)
      paystack.initialize.mockResolvedValue({ data: { authorization_url: 'https://paystack/checkout', access_code: 'ac' } })

      const result: any = await controller.initializePayment(user, { startTrial: true })

      expect(result.mode).toBe('trial')
      expect(result.authorizationUrl).toBe('https://paystack/checkout')
      const [amount, email, reference, callback, options] = paystack.initialize.mock.calls[0]
      expect(amount).toBe(TRIAL_CARD_CHECK_KOBO)
      expect(email).toBe('owner@example.com')
      expect(reference).toMatch(/^trial-/)
      expect(callback).toBe('https://dash.example.com/onboarding/payment-callback')
      expect(options).toEqual({ channels: ['card'], metadata: { tenant_id: user.tenant_id, purpose: 'trial_card_check' } })
    })

    it('refuses a second trial', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ ...pendingSub, trial_started_at: new Date() })
      await expect(controller.initializePayment(user, { startTrial: true })).rejects.toThrow(BadRequestException)
      expect(paystack.initialize).not.toHaveBeenCalled()
    })

    it('saves the reusable card, starts a 14-day trial and refunds the check', async () => {
      prisma.subscription.findUnique.mockResolvedValue(pendingSub)
      prisma.subscription.update.mockImplementation(async ({ data }: any) => data)
      paystack.verify.mockResolvedValue({
        data: {
          status: 'success',
          metadata: { tenant_id: user.tenant_id },
          customer: { email: 'owner@example.com' },
          authorization: { authorization_code: 'AUTH_x', reusable: true, last4: '4081', card_type: 'visa' },
        },
      })

      const result: any = await controller.verifyPayment('trial-tenant-1-1', user)

      expect(result).toMatchObject({ success: true, isTrial: true })
      const data = prisma.subscription.update.mock.calls[0][0].data
      expect(data).toMatchObject({
        status: 'trial',
        post_trial_plan_tier: 'starter',
        conversations_limit: 300,
        paystack_authorization_code: 'AUTH_x',
        card_last4: '4081',
        billing_email: 'owner@example.com',
      })
      const days = (data.trial_ends_at.getTime() - data.trial_started_at.getTime()) / 86400000
      expect(days).toBe(14)
      expect(paystack.refund).toHaveBeenCalledWith('trial-tenant-1-1')
      expect(prisma.invoice.updateMany).not.toHaveBeenCalled()
    })

    it("rejects a card-check payment made for another tenant", async () => {
      paystack.verify.mockResolvedValue({ data: { status: 'success', metadata: { tenant_id: 'someone-else' } } })
      await expect(controller.verifyPayment('trial-x-1', user)).rejects.toThrow(BadRequestException)
      expect(prisma.subscription.update).not.toHaveBeenCalled()
    })

    it('refunds and asks for another card when the card is not reusable', async () => {
      prisma.subscription.findUnique.mockResolvedValue(pendingSub)
      paystack.verify.mockResolvedValue({
        data: {
          status: 'success',
          metadata: { tenant_id: user.tenant_id },
          authorization: { authorization_code: 'AUTH_y', reusable: false },
        },
      })

      const result: any = await controller.verifyPayment('trial-tenant-1-2', user)

      expect(result).toMatchObject({ success: false, status: 'card_not_reusable' })
      expect(paystack.refund).toHaveBeenCalledWith('trial-tenant-1-2')
      expect(prisma.subscription.update).not.toHaveBeenCalled()
    })
  })

  describe('paid activation', () => {
    it('starts a fresh 30-day period when a past_due tenant pays', async () => {
      paystack.verify.mockResolvedValue({ data: { status: 'success' } })
      prisma.invoice.findFirst.mockResolvedValue({ plan: 'starter' })
      prisma.subscription.findUnique.mockResolvedValue({ status: 'past_due', plan_tier: 'starter' })

      await controller.verifyPayment('sub-abc-1', user)

      const data = prisma.subscription.update.mock.calls[0][0].data
      expect(data.status).toBe('active')
      expect(data.current_period_end.getTime()).toBeGreaterThan(Date.now() + 29 * 86400000)
      expect(data.conversations_limit).toBe(500)
    })

    it('lets a trial tenant pay for the plan they are trialling', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ status: 'trial', plan_tier: 'starter' })
      paystack.initialize.mockResolvedValue({ data: { authorization_url: 'u', access_code: 'a' } })

      const result: any = await controller.initializePayment(user, { newPlanTier: 'starter' })

      expect(result.authorizationUrl).toBe('u')
    })
  })

  describe('trial status & cancellation', () => {
    it('requires a tenant', async () => {
      await expect(controller.getTrialStatus({})).rejects.toThrow(UnauthorizedException)
      await expect(controller.setCancelAtPeriodEnd({}, {})).rejects.toThrow(UnauthorizedException)
    })

    it('turns auto-renew off by default', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ status: 'trial' })
      const result = await controller.setCancelAtPeriodEnd(user, {})
      expect(result).toEqual({ cancelAtPeriodEnd: true })
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { tenant_id: user.tenant_id },
        data: { cancel_at_period_end: true },
      })
    })
  })
})
