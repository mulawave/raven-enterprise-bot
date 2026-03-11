import { ForbiddenException } from '@nestjs/common'
import { BookingController } from './booking.controller'

describe('BookingController', () => {
  const prisma = {
    branch: {
      findFirst: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  }

  const staffScopeService = {
    getAssignedBranches: jest.fn(),
  }

  const controller = new BookingController(prisma as any, staffScopeService as any)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects requests without tenant credentials', async () => {
    await expect(controller.listBookings(undefined)).rejects.toBeInstanceOf(ForbiddenException)
    expect(staffScopeService.getAssignedBranches).not.toHaveBeenCalled()
  })

  it('rejects staff access to branches outside the assigned scope', async () => {
    staffScopeService.getAssignedBranches.mockResolvedValue(['branch-1'])

    await expect(
      controller.listBookings({ id: 'staff-1', tenant_id: 'tenant-1', role: 'staff' }, 'branch-2'),
    ).rejects.toBeInstanceOf(ForbiddenException)

    expect(staffScopeService.getAssignedBranches).toHaveBeenCalledWith('staff-1')
  })

  it('limits staff booking listings to assigned branches', async () => {
    const bookings = [{ id: 'booking-1' }]
    staffScopeService.getAssignedBranches.mockResolvedValue(['branch-1', 'branch-2'])
    prisma.booking.findMany.mockResolvedValue(bookings)

    const result = await controller.listBookings({ id: 'staff-1', tenant_id: 'tenant-1', role: 'staff' })

    expect(result).toEqual(bookings)
    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        tenant_id: 'tenant-1',
        branch_id: { in: ['branch-1', 'branch-2'] },
      },
      include: { customer: true, roomType: true },
      orderBy: { created_at: 'desc' },
    })
  })

  it('rejects booking creation when the room type does not belong to the tenant', async () => {
    prisma.branch.findFirst.mockResolvedValue({ id: 'branch-1', tenant_id: 'tenant-1' })
    jest.spyOn((controller as any).roomTypeService, 'getRoomTypeById').mockResolvedValue(null)

    await expect(
      controller.createBooking({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        customerId: 'customer-1',
        roomTypeId: 'room-type-x',
        start: '2026-03-10T00:00:00.000Z',
        end: '2026-03-11T00:00:00.000Z',
        totalKobo: 5000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)

    expect((controller as any).roomTypeService.getRoomTypeById).toHaveBeenCalledWith('tenant-1', 'room-type-x')
  })
})
