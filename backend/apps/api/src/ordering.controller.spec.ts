import { ForbiddenException } from '@nestjs/common'
import { OrderingController } from './ordering.controller'

describe('OrderingController', () => {
  const prisma = {
    branch: {
      findFirst: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  }

  const staffScopeService = {
    getAssignedBranches: jest.fn(),
  }

  const controller = new OrderingController(prisma as any, staffScopeService as any)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects requests without tenant credentials', async () => {
    await expect(controller.listOrders(undefined)).rejects.toBeInstanceOf(ForbiddenException)
    expect(staffScopeService.getAssignedBranches).not.toHaveBeenCalled()
  })

  it('rejects staff access to branches outside the assigned scope', async () => {
    staffScopeService.getAssignedBranches.mockResolvedValue(['branch-1'])

    await expect(
      controller.listOrders({ id: 'staff-1', tenant_id: 'tenant-1', role: 'staff' }, 'branch-2'),
    ).rejects.toBeInstanceOf(ForbiddenException)

    expect(staffScopeService.getAssignedBranches).toHaveBeenCalledWith('staff-1')
  })

  it('limits staff order listings to assigned branches', async () => {
    const orders = [{ id: 'order-1' }]
    staffScopeService.getAssignedBranches.mockResolvedValue(['branch-1', 'branch-2'])
    prisma.order.findMany.mockResolvedValue(orders)

    const result = await controller.listOrders({ id: 'staff-1', tenant_id: 'tenant-1', role: 'staff' })

    expect(result).toEqual(orders)
    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: {
        tenant_id: 'tenant-1',
        branch_id: { in: ['branch-1', 'branch-2'] },
      },
      include: { orderItems: true, customer: true },
      orderBy: { created_at: 'desc' },
    })
  })

  it('rejects order creation when the branch does not belong to the cart tenant', async () => {
    prisma.branch.findFirst.mockResolvedValue(null)

    await expect(
      controller.createOrder({
        branchId: 'branch-x',
        cart: {
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          items: [],
        } as any,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)

    expect(prisma.branch.findFirst).toHaveBeenCalledWith({
      where: { id: 'branch-x', tenant_id: 'tenant-1' },
    })
  })
})
