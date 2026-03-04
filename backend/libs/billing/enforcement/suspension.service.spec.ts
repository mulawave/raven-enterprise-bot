import { Test, TestingModule } from '@nestjs/testing'
import { PrismaClient } from '@prisma/client'
import { SuspensionService } from './suspension.service'

describe('SuspensionService', () => {
  let service: SuspensionService
  let prisma: jest.Mocked<PrismaClient>

  beforeEach(async () => {
    const mockPrisma = {
      tenant: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      subscription: {
        findUnique: jest.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuspensionService,
        { provide: PrismaClient, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<SuspensionService>(SuspensionService)
    prisma = mockPrisma as unknown as jest.Mocked<PrismaClient>
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('suspendTenant()', () => {
    it('should update tenant to suspended=true', async () => {
      ;(prisma.tenant.update as jest.Mock).mockResolvedValue({ id: 'tenant-1', suspended: true })
      await service.suspendTenant('tenant-1')
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-1' },
          data: expect.objectContaining({ suspended: true }),
        }),
      )
    })
  })

  describe('unsuspendTenant()', () => {
    it('should update tenant to suspended=false', async () => {
      ;(prisma.tenant.update as jest.Mock).mockResolvedValue({ id: 'tenant-1', suspended: false })
      await service.unsuspendTenant('tenant-1')
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-1' },
          data: expect.objectContaining({ suspended: false }),
        }),
      )
    })
  })
})
