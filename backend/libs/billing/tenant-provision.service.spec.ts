import { Test, TestingModule } from '@nestjs/testing'
import { PrismaClient } from '@prisma/client'
import { TenantProvisionService } from '../../apps/api/admin/onboarding/tenant.provision.service'

const PROVISION_INPUT = {
  tenantName: 'Test Co',
  owner: { email: 'owner@test.co', password: 'secret123' },
  staff: { email: 'staff@test.co', password: 'secret456' },
}

describe('TenantProvisionService', () => {
  let service: TenantProvisionService
  let prisma: { $transaction: jest.Mock }

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const mockTx = {
          tenant: { create: jest.fn().mockResolvedValue({ id: 'tenant-1', name: 'Test Co' }) },
          user: { create: jest.fn().mockResolvedValue({ id: 'user-1' }) },
          menuCategory: { create: jest.fn().mockResolvedValue({ id: 'cat-1' }) },
          menuItem: { create: jest.fn().mockResolvedValue({ id: 'item-1' }) },
          roomType: { create: jest.fn().mockResolvedValue({ id: 'room-1' }) },
          subscription: { create: jest.fn().mockResolvedValue({ id: 'sub-1' }) },
        }
        return fn(mockTx)
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantProvisionService,
        { provide: PrismaClient, useValue: prisma },
      ],
    }).compile()

    service = module.get<TenantProvisionService>(TenantProvisionService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('provision()', () => {
    it('should create tenant inside a transaction', async () => {
      const result = await service.provision(PROVISION_INPUT)
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
      expect(result).toBeDefined()
    })
  })
})

