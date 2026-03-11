import { NotFoundException, UnauthorizedException } from '@nestjs/common'
import { TenantContextController } from './tenant-context.controller'

describe('TenantContextController', () => {
  const prisma = {
    tenant: {
      findUnique: jest.fn(),
    },
  }

  const brandingService = {
    getBranding: jest.fn(),
  }

  const subscriptionsService = {
    getSubscription: jest.fn(),
    createSubscription: jest.fn(),
  }

  const suspensionService = {
    isSuspended: jest.fn(),
  }

  const controller = new TenantContextController(
    prisma as any,
    brandingService as any,
    subscriptionsService as any,
    suspensionService as any,
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects requests without tenant credentials', async () => {
    await expect(controller.getTenantContext(undefined)).rejects.toBeInstanceOf(UnauthorizedException)
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled()
  })

  it('rejects access when the tenant does not exist', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null)

    await expect(controller.getTenantContext({ tenant_id: 'missing-tenant' })).rejects.toBeInstanceOf(NotFoundException)
  })

  it('reads tenant context without creating a subscription as a side effect', async () => {
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      name: 'Tenant One',
      logo_url: '/uploads/settings/logo.png',
    })
    subscriptionsService.getSubscription.mockResolvedValue(null)
    brandingService.getBranding.mockResolvedValue(null)
    suspensionService.isSuspended.mockResolvedValue(false)

    const result = await controller.getTenantContext({ tenant_id: 'tenant-1' })

    expect(subscriptionsService.getSubscription).toHaveBeenCalledWith('tenant-1')
    expect(subscriptionsService.createSubscription).not.toHaveBeenCalled()
    expect(result.subscription.plan).toBe('starter')
    expect(result.subscription.status).toBe('trial')
    expect(result.tenant.status).toBe('TRIAL')
  })
})