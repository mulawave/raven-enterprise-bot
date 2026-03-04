import { Test, TestingModule } from '@nestjs/testing'
import { PrismaClient } from '@prisma/client'
import { SubscriptionsService } from './subscriptions.service'

describe('SubscriptionsService', () => {
  let service: SubscriptionsService
  let prisma: {
    subscription: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock }
    conversationCount: { upsert: jest.Mock } | undefined
    $queryRaw: jest.Mock | undefined
  }

  beforeEach(async () => {
    prisma = {
      subscription: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      // real SubscriptionsService may upsert elsewhere — keep flexible
      $queryRaw: undefined,
      conversationCount: undefined,
    } as typeof prisma

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaClient, useValue: prisma },
      ],
    }).compile()

    service = module.get<SubscriptionsService>(SubscriptionsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getSubscription()', () => {
    it('should return subscription for a tenant', async () => {
      const mockSub = { id: 'sub-1', tenant_id: 'tenant-1', plan_tier: 'PRO', status: 'ACTIVE' }
      prisma.subscription.findUnique.mockResolvedValue(mockSub)
      const result = await service.getSubscription('tenant-1')
      expect(result).toEqual(mockSub)
    })

    it('should return null when tenant has no subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null)
      const result = await service.getSubscription('no-tenant')
      expect(result).toBeNull()
    })
  })
})
