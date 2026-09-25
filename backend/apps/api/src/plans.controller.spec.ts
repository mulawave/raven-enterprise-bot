import { PlansController } from './plans.controller'

describe('PlansController', () => {
  const prisma = {
    plan: {
      findMany: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
    },
  }

  const controller = new PlansController(prisma as any)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns public active plans with parsed features and formatted prices', async () => {
    prisma.plan.findMany.mockResolvedValue([
      {
        tier: 'starter',
        name: 'Starter',
        description: 'Starter plan',
        price_kobo: 4900000,
        conversations_limit: 500,
        overage_price_kobo: 12000,
        features: JSON.stringify(['WhatsApp bot', 'Basic analytics']),
        is_active: true,
        sort_order: 1,
      },
    ])

    const result = await controller.getPublicPlans()

    expect(prisma.plan.findMany).toHaveBeenCalledWith({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    })
    expect(result).toEqual({
      plans: [
        {
          tier: 'starter',
          name: 'Starter',
          description: 'Starter plan',
          price_kobo: 4900000,
          price_formatted: '₦49,000',
          conversations_limit: 500,
          overage_price_kobo: 12000,
          overage_price_formatted: '₦120',
          features: ['WhatsApp bot', 'Basic analytics'],
          is_active: true,
          sort_order: 1,
        },
      ],
    })
  })

  it('returns tenant plans with currentPlanTier from the subscription', async () => {
    prisma.plan.findMany.mockResolvedValue([
      {
        tier: 'growth',
        name: 'Growth',
        description: 'Growth plan',
        price_kobo: 19900000,
        conversations_limit: 2500,
        overage_price_kobo: 10000,
        features: JSON.stringify(['Broadcast messaging']),
        is_active: true,
        sort_order: 2,
      },
    ])
    prisma.subscription.findUnique.mockResolvedValue({ plan_tier: 'growth' })

    const result = await controller.getPlans({ tenant_id: 'tenant-1' })

    expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
      where: { tenant_id: 'tenant-1' },
      select: { plan_tier: true },
    })
    expect(result.currentPlanTier).toBe('growth')
    expect(result.plans[0].features).toEqual(['Broadcast messaging'])
    expect(result.plans[0].is_active).toBe(true)
  })

  it('falls back to starter when the tenant has no subscription yet', async () => {
    prisma.plan.findMany.mockResolvedValue([])
    prisma.subscription.findUnique.mockResolvedValue(null)

    const result = await controller.getPlans({ tenant_id: 'tenant-1' })

    expect(result).toEqual({
      currentPlanTier: 'starter',
      plans: [],
    })
  })
})