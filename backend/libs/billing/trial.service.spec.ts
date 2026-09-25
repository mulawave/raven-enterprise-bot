import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { TrialService } from './trial.service'
import { PrismaClient } from '@prisma/client'

describe('TrialService', () => {
  let service: TrialService
  let prisma: PrismaClient
  const mockPrisma = {
    subscription: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrialService,
        {
          provide: PrismaClient,
          useValue: mockPrisma,
        },
      ],
    }).compile()

    service = module.get<TrialService>(TrialService)
    prisma = module.get<PrismaClient>(PrismaClient)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('startTrial', () => {
    it('should start a 7-day trial', async () => {
      const tenantId = 'tenant-1'
      const now = new Date()
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      mockPrisma.subscription.findUnique.mockResolvedValueOnce({
        tenant_id: tenantId,
        trial_started_at: null,
        status: 'trial',
      })

      mockPrisma.subscription.update.mockResolvedValueOnce({
        tenant_id: tenantId,
        plan_tier: 'promo',
        status: 'trial',
        trial_started_at: now,
        trial_ends_at: trialEndsAt,
      })

      const result = await service.startTrial(tenantId)

      expect(result.trialStartedAt).toBeDefined()
      expect(result.trialEndsAt).toBeDefined()
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenant_id: tenantId },
          data: expect.objectContaining({
            status: 'trial',
            plan_tier: 'promo',
          }),
        }),
      )
    })

    it('should throw if trial already started', async () => {
      const tenantId = 'tenant-1'
      const pastDate = new Date(Date.now() - 1000)

      mockPrisma.subscription.findUnique.mockResolvedValueOnce({
        tenant_id: tenantId,
        trial_started_at: pastDate,
        status: 'trial',
      })

      await expect(service.startTrial(tenantId)).rejects.toThrow('Trial already started')
    })

    it('should throw if subscription not found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValueOnce(null)

      await expect(service.startTrial('nonexistent')).rejects.toThrow('Subscription not found')
    })
  })

  describe('getTrialStatus', () => {
    it('should return active trial status', async () => {
      const tenantId = 'tenant-1'
      const now = new Date()
      const trialEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days from now

      mockPrisma.subscription.findUnique.mockResolvedValueOnce({
        tenant_id: tenantId,
        status: 'trial',
        trial_started_at: now,
        trial_ends_at: trialEndsAt,
        trial_converted_at: null,
      })

      const result = await service.getTrialStatus(tenantId)

      expect(result.isTrialActive).toBe(true)
      expect(result.hasExpired).toBe(false)
      expect(result.daysRemaining).toBe(3)
    })

    it('should return expired trial status', async () => {
      const tenantId = 'tenant-1'
      const now = new Date()
      const trialEndsAt = new Date(now.getTime() - 1000) // Expired 1 second ago

      mockPrisma.subscription.findUnique.mockResolvedValueOnce({
        tenant_id: tenantId,
        status: 'trial',
        trial_started_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        trial_ends_at: trialEndsAt,
        trial_converted_at: null,
      })

      const result = await service.getTrialStatus(tenantId)

      expect(result.isTrialActive).toBe(true)
      expect(result.hasExpired).toBe(true)
      expect(result.daysRemaining).toBe(0)
    })

    it('should throw if subscription not found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValueOnce(null)

      await expect(service.getTrialStatus('nonexistent')).rejects.toThrow('Subscription not found')
    })
  })

  describe('convertTrial', () => {
    it('should convert active trial to paid subscription', async () => {
      const tenantId = 'tenant-1'
      const now = new Date()
      const trialEndsAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

      mockPrisma.subscription.findUnique.mockResolvedValueOnce({
        tenant_id: tenantId,
        status: 'trial',
        plan_tier: 'promo',
        trial_started_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        trial_ends_at: trialEndsAt,
        trial_converted_at: null,
      })

      mockPrisma.subscription.update.mockResolvedValueOnce({
        tenant_id: tenantId,
        status: 'active',
        plan_tier: 'starter',
        trial_converted_at: now,
      })

      const result = await service.convertTrial(tenantId, 'starter')

      expect(result.status).toBe('active')
      expect(result.planTier).toBe('starter')
      expect(result.convertedAt).toBeDefined()
    })

    it('should throw if subscription not in trial', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValueOnce({
        tenant_id: 'tenant-1',
        status: 'active',
      })

      await expect(service.convertTrial('tenant-1', 'starter')).rejects.toThrow(
        'Subscription is not in trial status',
      )
    })

    it('should throw if trial has expired', async () => {
      const tenantId = 'tenant-1'
      const now = new Date()
      const trialEndsAt = new Date(now.getTime() - 1000) // Expired

      mockPrisma.subscription.findUnique.mockResolvedValueOnce({
        tenant_id: tenantId,
        status: 'trial',
        trial_ends_at: trialEndsAt,
      })

      await expect(service.convertTrial(tenantId, 'starter')).rejects.toThrow('Trial period has expired')
    })
  })

  describe('checkAndHandleExpiredTrial', () => {
    it('should mark expired trial as past_due', async () => {
      const tenantId = 'tenant-1'
      const now = new Date()
      const trialEndsAt = new Date(now.getTime() - 1000)

      mockPrisma.subscription.findUnique.mockResolvedValueOnce({
        tenant_id: tenantId,
        status: 'trial',
        trial_ends_at: trialEndsAt,
      })

      mockPrisma.subscription.update.mockResolvedValueOnce({})

      const result = await service.checkAndHandleExpiredTrial(tenantId)

      expect(result.isExpired).toBe(true)
      expect(result.requiresAction).toBe(true)
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'past_due' },
        }),
      )
    })

    it('should return false for active trial', async () => {
      const tenantId = 'tenant-1'
      const now = new Date()
      const trialEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

      mockPrisma.subscription.findUnique.mockResolvedValueOnce({
        tenant_id: tenantId,
        status: 'trial',
        trial_ends_at: trialEndsAt,
      })

      const result = await service.checkAndHandleExpiredTrial(tenantId)

      expect(result.isExpired).toBe(false)
      expect(result.requiresAction).toBe(false)
    })
  })
})
