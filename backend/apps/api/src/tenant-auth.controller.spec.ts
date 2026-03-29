import { UnauthorizedException } from '@nestjs/common'
import { UserScope } from '@prisma/client'
import { TenantAuthController } from './tenant-auth.controller'

describe('TenantAuthController', () => {
  const authService = {
    validateUser: jest.fn(),
    login: jest.fn(),
  }

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  }

  const staffScopeService = {
    getAssignedBranches: jest.fn(),
  }

  const emailService = {
    send: jest.fn(),
  }

  const configLoader = {
    get: jest.fn(),
  }

  const controller = new TenantAuthController(authService as any, prisma as any, staffScopeService as any, emailService as any, configLoader as any)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects login when email or password is missing', async () => {
    await expect(controller.login({ email: '', password: '' })).rejects.toBeInstanceOf(UnauthorizedException)
    expect(authService.validateUser).not.toHaveBeenCalled()
  })

  it('rejects login for non-tenant users', async () => {
    authService.validateUser.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      scope: UserScope.SYSTEM,
      tenant_id: null,
    })

    await expect(
      controller.login({ email: 'admin@example.com', password: 'secret' }),
    ).rejects.toBeInstanceOf(UnauthorizedException)

    expect(authService.login).not.toHaveBeenCalled()
  })

  it('rejects /me for users without tenant scope', async () => {
    await expect(controller.me({ id: 'user-1', scope: UserScope.SYSTEM })).rejects.toBeInstanceOf(UnauthorizedException)
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('returns assigned branch ids for tenant staff users', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'staff@example.com',
      name: 'Staff User',
      role: 'staff',
      scope: UserScope.TENANT,
      tenant_id: 'tenant-1',
      created_at: new Date('2026-03-09T00:00:00.000Z'),
    })
    staffScopeService.getAssignedBranches.mockResolvedValue(['branch-1', 'branch-2'])

    const result = await controller.me({ id: 'user-1', scope: UserScope.TENANT, tenant_id: 'tenant-1' })

    expect(result).toMatchObject({
      id: 'user-1',
      tenant_id: 'tenant-1',
      branch_ids: ['branch-1', 'branch-2'],
    })
    expect(staffScopeService.getAssignedBranches).toHaveBeenCalledWith('user-1')
  })
})
