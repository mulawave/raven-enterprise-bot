import { BillingRenewalService } from './billing-renewal.service'
import { PaystackService } from '../payments/paystack.service'

describe('BillingRenewalService', () => {
  const now = new Date('2026-10-10T10:00:00Z')
  const prisma = {
    subscription: { findMany: jest.fn(), updateMany: jest.fn(), update: jest.fn((args: any) => args) },
    invoice: { findFirst: jest.fn(), create: jest.fn(), updateMany: jest.fn((args: any) => args) },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
  }
  const configLoader = { getPaystackSecret: jest.fn().mockResolvedValue('sk_test') }
  const notificationService = { send: jest.fn().mockResolvedValue(undefined) }
  const subscriptionsService = {
    lookupPlan: jest.fn().mockResolvedValue({ name: 'Growth Plan', priceKobo: 19900000, conversationsLimit: 2500, overagePriceKobo: 10000 }),
  }
  const service = new BillingRenewalService(prisma as any, configLoader as any, notificationService as any, subscriptionsService as any)

  const trialSub = {
    id: 'sub-1234567890',
    tenant_id: 'tenant-1',
    status: 'trial',
    plan_tier: 'growth',
    post_trial_plan_tier: 'growth',
    cancel_at_period_end: false,
    paystack_authorization_code: 'AUTH_1',
    billing_email: 'owner@example.com',
    current_period_end: new Date('2026-10-10T09:00:00Z'),
    last_charge_attempt_at: null,
  }

  let charge: jest.SpyInstance
  let verify: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    prisma.subscription.updateMany.mockResolvedValue({ count: 1 })
    prisma.invoice.findFirst.mockResolvedValue(null)
    charge = jest.spyOn(PaystackService.prototype, 'chargeAuthorization')
    verify = jest.spyOn(PaystackService.prototype, 'verify')
  })

  afterEach(() => {
    charge.mockRestore()
    verify.mockRestore()
  })

  it('converts an ended trial by charging the saved card for the chosen plan', async () => {
    prisma.subscription.findMany.mockResolvedValue([trialSub])
    charge.mockResolvedValue({ status: 'success' })

    const counts = await service.processDueSubscriptions(now)

    expect(counts.activated).toBe(1)
    expect(charge).toHaveBeenCalledWith('AUTH_1', 'owner@example.com', 19900000, `renew-sub-1234-${trialSub.current_period_end.getTime()}`, expect.any(Object))
    const update = prisma.subscription.update.mock.calls[0][0]
    expect(update.data).toMatchObject({ status: 'active', plan_tier: 'growth', conversations_limit: 2500, conversations_used: 0, trial_converted_at: now })
    expect(update.data.current_period_end.getTime()).toBe(now.getTime() + 30 * 86400000)
  })

  it('pauses the account (past_due) when the charge fails', async () => {
    prisma.subscription.findMany.mockResolvedValue([trialSub])
    charge.mockResolvedValue({ status: 'failed', gatewayResponse: 'Insufficient Funds' })

    const counts = await service.processDueSubscriptions(now)

    expect(counts.past_due).toBe(1)
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: trialSub.id },
      data: { status: 'past_due', last_charge_error: 'Insufficient Funds' },
    })
    expect(notificationService.send).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1', type: 'payment' }))
  })

  it('ends the subscription without charging when auto-renew was turned off', async () => {
    prisma.subscription.findMany.mockResolvedValue([{ ...trialSub, cancel_at_period_end: true }])

    const counts = await service.processDueSubscriptions(now)

    expect(counts.cancelled).toBe(1)
    expect(charge).not.toHaveBeenCalled()
  })

  it('skips a subscription another instance already claimed', async () => {
    prisma.subscription.findMany.mockResolvedValue([trialSub])
    prisma.subscription.updateMany.mockResolvedValue({ count: 0 })

    const counts = await service.processDueSubscriptions(now)

    expect(counts.skipped).toBe(1)
    expect(charge).not.toHaveBeenCalled()
  })

  it('re-verifies an earlier attempt for the same period instead of charging twice', async () => {
    prisma.subscription.findMany.mockResolvedValue([trialSub])
    prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1', status: 'pending' })
    verify.mockResolvedValue({ data: { status: 'success' } })

    const counts = await service.processDueSubscriptions(now)

    expect(counts.activated).toBe(1)
    expect(charge).not.toHaveBeenCalled()
    expect(prisma.invoice.create).not.toHaveBeenCalled()
  })

  it('leaves a pending charge for the next run', async () => {
    prisma.subscription.findMany.mockResolvedValue([trialSub])
    charge.mockResolvedValue({ status: 'pending' })

    const counts = await service.processDueSubscriptions(now)

    expect(counts.pending).toBe(1)
    expect(prisma.subscription.update).not.toHaveBeenCalled()
  })
})
