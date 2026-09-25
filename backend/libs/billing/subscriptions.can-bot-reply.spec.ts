import { SubscriptionsService } from './subscriptions.service'

describe('SubscriptionsService.canBotReply', () => {
  const prisma = { subscription: { findUnique: jest.fn() } }
  const service = new SubscriptionsService(prisma as any)
  const base = { trial_ends_at: null, conversations_used: 0, conversations_limit: 300 }

  it.each([
    ['no subscription (legacy tenant)', null, true],
    ['active', { ...base, status: 'active' }, true],
    ['pending_payment', { ...base, status: 'pending_payment' }, true],
    ['past_due', { ...base, status: 'past_due' }, false],
    ['cancelled', { ...base, status: 'cancelled' }, false],
    ['trial in progress', { ...base, status: 'trial', trial_ends_at: new Date(Date.now() + 86400000) }, true],
    ['trial past its end date', { ...base, status: 'trial', trial_ends_at: new Date(Date.now() - 1000) }, false],
    ['trial at its conversation cap', { ...base, status: 'trial', trial_ends_at: new Date(Date.now() + 86400000), conversations_used: 300 }, false],
  ])('%s → %s', async (_label, sub, expected) => {
    prisma.subscription.findUnique.mockResolvedValue(sub)
    await expect(service.canBotReply('tenant-1')).resolves.toBe(expected)
  })
})
