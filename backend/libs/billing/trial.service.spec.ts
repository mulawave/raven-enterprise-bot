import { BadRequestException } from '@nestjs/common'
import { TrialService, TRIAL_CONVERSATION_CAP, TRIAL_DURATION_DAYS } from './trial.service'

describe('TrialService', () => {
  const prisma = {
    subscription: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  }
  const service = new TrialService(prisma as any)
  const card = { authorizationCode: 'AUTH_1', last4: '4081', brand: 'visa', email: 'owner@example.com' }

  beforeEach(() => jest.clearAllMocks())

  describe('isEligible', () => {
    it('allows only never-trialled, unpaid accounts', () => {
      expect(service.isEligible({ status: 'pending_payment', trial_started_at: null })).toBe(true)
      expect(service.isEligible({ status: 'pending_payment', trial_started_at: new Date() })).toBe(false)
      expect(service.isEligible({ status: 'active', trial_started_at: null })).toBe(false)
      expect(service.isEligible({ status: 'cancelled', trial_started_at: new Date() })).toBe(false)
    })
  })

  describe('startTrialWithCard', () => {
    it('starts a 14-day capped trial and remembers the plan to bill', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ status: 'pending_payment', trial_started_at: null, plan_tier: 'growth' })
      prisma.subscription.update.mockImplementation(async ({ data }: any) => data)

      const result = await service.startTrialWithCard('tenant-1', card)

      const data = prisma.subscription.update.mock.calls[0][0].data
      expect(data).toMatchObject({
        status: 'trial',
        post_trial_plan_tier: 'growth',
        conversations_limit: TRIAL_CONVERSATION_CAP,
        conversations_used: 0,
        paystack_authorization_code: 'AUTH_1',
        billing_email: 'owner@example.com',
        cancel_at_period_end: false,
      })
      expect(data.current_period_end).toEqual(data.trial_ends_at)
      expect((result.trialEndsAt.getTime() - result.trialStartedAt.getTime()) / 86400000).toBe(TRIAL_DURATION_DAYS)
    })

    it('rejects ineligible accounts', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ status: 'active', trial_started_at: null, plan_tier: 'starter' })
      await expect(service.startTrialWithCard('tenant-1', card)).rejects.toThrow(BadRequestException)
      expect(prisma.subscription.update).not.toHaveBeenCalled()
    })

    it('throws if the subscription is missing', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null)
      await expect(service.startTrialWithCard('tenant-1', card)).rejects.toThrow(BadRequestException)
    })
  })

  describe('getTrialStatus', () => {
    it('reports days left, the plan to bill and the saved card', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        status: 'trial',
        plan_tier: 'starter',
        post_trial_plan_tier: 'starter',
        trial_started_at: new Date(),
        trial_ends_at: new Date(Date.now() + 3 * 86400000 - 1000),
        trial_converted_at: null,
        cancel_at_period_end: false,
        card_last4: '4081',
        card_brand: 'visa',
      })

      const status = await service.getTrialStatus('tenant-1')

      expect(status).toMatchObject({
        isTrialActive: true,
        daysRemaining: 3,
        hasExpired: false,
        postTrialPlanTier: 'starter',
        cardLast4: '4081',
      })
    })

    it('marks an elapsed trial as expired and inactive', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        status: 'trial',
        plan_tier: 'starter',
        trial_ends_at: new Date(Date.now() - 1000),
        cancel_at_period_end: false,
      })

      const status = await service.getTrialStatus('tenant-1')

      expect(status.isTrialActive).toBe(false)
      expect(status.hasExpired).toBe(true)
      expect(status.daysRemaining).toBe(0)
    })
  })

  describe('setCancelAtPeriodEnd', () => {
    it('only applies to trial or active subscriptions', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ status: 'past_due' })
      await expect(service.setCancelAtPeriodEnd('tenant-1', true)).rejects.toThrow(BadRequestException)
    })

    it('can resume auto-renew', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ status: 'active' })
      await expect(service.setCancelAtPeriodEnd('tenant-1', false)).resolves.toEqual({ cancelAtPeriodEnd: false })
    })
  })
})
