import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, UnauthorizedException, CanActivate } from '@nestjs/common'
import { SubscriptionPaymentController } from './subscription-payment.controller'
import { PaystackService } from '../../../libs/payments/paystack.service'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'
import { SubscriptionsService } from '../../../libs/billing/subscriptions.service'
import { TrialService } from '../../../libs/billing/trial.service'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'

// Mock guard to bypass authentication
class MockJwtAuthGuard implements CanActivate {
  canActivate() {
    return true
  }
}

describe('SubscriptionPaymentController', () => {
  let controller: SubscriptionPaymentController
  let prisma: PrismaClient
  let trialService: TrialService
  let subscriptionsService: SubscriptionsService

  const mockPrisma = {
    subscription: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  }

  const mockPaystack = {
    initialize: jest.fn(),
    verify: jest.fn(),
  }

  const mockConfigLoader = {
    getPaystackSecret: jest.fn(),
  }

  const mockTrialService = {
    startTrial: jest.fn(),
    getTrialStatus: jest.fn(),
    convertTrial: jest.fn(),
  }

  const mockSubscriptionsService = {
    lookupPlan: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionPaymentController],
      providers: [
        {
          provide: PrismaClient,
          useValue: mockPrisma,
        },
        {
          provide: PaystackService,
          useValue: mockPaystack,
        },
        {
          provide: ConfigLoaderService,
          useValue: mockConfigLoader,
        },
        {
          provide: TrialService,
          useValue: mockTrialService,
        },
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .compile()

    controller = module.get<SubscriptionPaymentController>(SubscriptionPaymentController)
    prisma = module.get<PrismaClient>(PrismaClient)
    trialService = module.get<TrialService>(TrialService)
    subscriptionsService = module.get<SubscriptionsService>(SubscriptionsService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('startTrial', () => {
    it('should start a trial with default promo plan', async () => {
      const user = { tenant_id: 'tenant-1' }
      const now = new Date()
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      mockTrialService.startTrial.mockResolvedValueOnce({
        trialStartedAt: now,
        trialEndsAt,
      })

      const result = await controller.startTrial(user, {})

      expect(result.success).toBe(true)
      expect(result.daysRemaining).toBe(7)
      expect(mockTrialService.startTrial).toHaveBeenCalledWith('tenant-1', 'promo')
    })

    it('should start a trial with specified plan tier', async () => {
      const user = { tenant_id: 'tenant-1' }
      const now = new Date()
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      mockTrialService.startTrial.mockResolvedValueOnce({
        trialStartedAt: now,
        trialEndsAt,
      })

      const result = await controller.startTrial(user, { planTier: 'starter' })

      expect(result.success).toBe(true)
      expect(mockTrialService.startTrial).toHaveBeenCalledWith('tenant-1', 'starter')
    })

    it('should throw if user not authenticated', async () => {
      const user = { tenant_id: null }

      await expect(controller.startTrial(user, {})).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('getTrialStatus', () => {
    it('should return trial status', async () => {
      const user = { tenant_id: 'tenant-1' }
      const now = new Date()
      const trialEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

      mockTrialService.getTrialStatus.mockResolvedValueOnce({
        isTrialActive: true,
        trialStartedAt: now,
        trialEndsAt,
        daysRemaining: 3,
        hasExpired: false,
        trialConvertedAt: null,
      })

      const result = await controller.getTrialStatus(user)

      expect(result.isTrialActive).toBe(true)
      expect(result.daysRemaining).toBe(3)
      expect(result.hasExpired).toBe(false)
    })

    it('should throw if user not authenticated', async () => {
      const user = { tenant_id: null }

      await expect(controller.getTrialStatus(user)).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('convertTrial', () => {
    it('should convert trial to starter plan', async () => {
      const user = { tenant_id: 'tenant-1' }
      const now = new Date()

      mockTrialService.convertTrial.mockResolvedValueOnce({
        status: 'active',
        planTier: 'starter',
        convertedAt: now,
      })

      const result = await controller.convertTrial(user, { planTier: 'starter' })

      expect(result.success).toBe(true)
      expect(result.status).toBe('active')
      expect(result.planTier).toBe('starter')
      expect(mockTrialService.convertTrial).toHaveBeenCalledWith('tenant-1', 'starter')
    })

    it('should convert trial to growth plan', async () => {
      const user = { tenant_id: 'tenant-1' }
      const now = new Date()

      mockTrialService.convertTrial.mockResolvedValueOnce({
        status: 'active',
        planTier: 'growth',
        convertedAt: now,
      })

      const result = await controller.convertTrial(user, { planTier: 'growth' })

      expect(result.success).toBe(true)
      expect(result.planTier).toBe('growth')
    })

    it('should throw if user not authenticated', async () => {
      const user = { tenant_id: null }

      await expect(controller.convertTrial(user, { planTier: 'starter' })).rejects.toThrow(UnauthorizedException)
    })

    it('should throw if planTier is not provided', async () => {
      const user = { tenant_id: 'tenant-1' }

      await expect(controller.convertTrial(user, { planTier: '' })).rejects.toThrow(BadRequestException)
    })

    it('should throw if planTier is invalid', async () => {
      const user = { tenant_id: 'tenant-1' }

      await expect(controller.convertTrial(user, { planTier: 'invalid' })).rejects.toThrow(BadRequestException)
    })
  })
})


  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('startTrial', () => {
    it('should start a trial with default promo plan', async () => {
      const user = { tenant_id: 'tenant-1' }
      const now = new Date()
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      mockTrialService.startTrial.mockResolvedValueOnce({
        trialStartedAt: now,
        trialEndsAt,
      })

      const result = await controller.startTrial(user, {})

      expect(result.success).toBe(true)
      expect(result.daysRemaining).toBe(7)
      expect(mockTrialService.startTrial).toHaveBeenCalledWith('tenant-1', 'promo')
    })

    it('should start a trial with specified plan tier', async () => {
      const user = { tenant_id: 'tenant-1' }
      const now = new Date()
      const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      mockTrialService.startTrial.mockResolvedValueOnce({
        trialStartedAt: now,
        trialEndsAt,
      })

      const result = await controller.startTrial(user, { planTier: 'starter' })

      expect(result.success).toBe(true)
      expect(mockTrialService.startTrial).toHaveBeenCalledWith('tenant-1', 'starter')
    })

    it('should throw if user not authenticated', async () => {
      const user = { tenant_id: null }

      await expect(controller.startTrial(user, {})).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('getTrialStatus', () => {
    it('should return trial status', async () => {
      const user = { tenant_id: 'tenant-1' }
      const now = new Date()
      const trialEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

      mockTrialService.getTrialStatus.mockResolvedValueOnce({
        isTrialActive: true,
        trialStartedAt: now,
        trialEndsAt,
        daysRemaining: 3,
        hasExpired: false,
        trialConvertedAt: null,
      })

      const result = await controller.getTrialStatus(user)

      expect(result.isTrialActive).toBe(true)
      expect(result.daysRemaining).toBe(3)
      expect(result.hasExpired).toBe(false)
    })

    it('should throw if user not authenticated', async () => {
      const user = { tenant_id: null }

      await expect(controller.getTrialStatus(user)).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('convertTrial', () => {
    it('should convert trial to starter plan', async () => {
      const user = { tenant_id: 'tenant-1' }
      const now = new Date()

      mockTrialService.convertTrial.mockResolvedValueOnce({
        status: 'active',
        planTier: 'starter',
        convertedAt: now,
      })

      const result = await controller.convertTrial(user, { planTier: 'starter' })

      expect(result.success).toBe(true)
      expect(result.status).toBe('active')
      expect(result.planTier).toBe('starter')
      expect(mockTrialService.convertTrial).toHaveBeenCalledWith('tenant-1', 'starter')
    })

    it('should convert trial to growth plan', async () => {
      const user = { tenant_id: 'tenant-1' }
      const now = new Date()

      mockTrialService.convertTrial.mockResolvedValueOnce({
        status: 'active',
        planTier: 'growth',
        convertedAt: now,
      })

      const result = await controller.convertTrial(user, { planTier: 'growth' })

      expect(result.success).toBe(true)
      expect(result.planTier).toBe('growth')
    })

    it('should throw if user not authenticated', async () => {
      const user = { tenant_id: null }

      await expect(controller.convertTrial(user, { planTier: 'starter' })).rejects.toThrow(UnauthorizedException)
    })

    it('should throw if planTier is not provided', async () => {
      const user = { tenant_id: 'tenant-1' }

      await expect(controller.convertTrial(user, { planTier: '' })).rejects.toThrow(BadRequestException)
    })

    it('should throw if planTier is invalid', async () => {
      const user = { tenant_id: 'tenant-1' }

      await expect(controller.convertTrial(user, { planTier: 'invalid' })).rejects.toThrow(BadRequestException)
    })
  })
})
