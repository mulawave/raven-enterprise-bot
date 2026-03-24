import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { PaymentController } from './payment.controller'

describe('PaymentController', () => {
  const prisma = {
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  }

  let controller: PaymentController

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret'
    controller = new PaymentController(prisma as any, { get: jest.fn() } as any, null as any)
  })

  it('rejects requests without tenant credentials', async () => {
    await expect(controller.checkPaymentStatus(undefined, 'order-1')).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.order.findFirst).not.toHaveBeenCalled()
  })

  it('rejects access to orders outside the authenticated tenant', async () => {
    prisma.order.findFirst.mockResolvedValue(null)

    await expect(
      controller.checkPaymentStatus({ tenant_id: 'tenant-1', role: 'owner' }, 'order-1'),
    ).rejects.toBeInstanceOf(ForbiddenException)

    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: { id: 'order-1', tenant_id: 'tenant-1' },
    })
    expect(prisma.payment.findFirst).not.toHaveBeenCalled()
  })

  it('returns paid status only after validating tenant ownership', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 'order-1', tenant_id: 'tenant-1' })
    prisma.payment.findFirst.mockResolvedValue({ id: 'payment-1', status: 'paid' })

    const result = await controller.checkPaymentStatus({ tenant_id: 'tenant-1', role: 'owner' }, 'order-1')

    expect(result).toEqual({ isPaid: true })
    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: { tenant_id: 'tenant-1', order_id: 'order-1', status: 'paid' },
    })
  })

  it('rejects payment initialization when the referenced resource does not exist', async () => {
    prisma.order.findUnique.mockResolvedValue(null)

    await expect(
      controller.initializePayment({
        orderId: 'missing-order',
        amountKobo: 5000,
        email: 'owner@example.com',
        provider: 'paystack',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects payment initialization when order and booking belong to different tenants', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'order-1', tenant_id: 'tenant-1', total_kobo: 5000 })
    prisma.booking.findUnique.mockResolvedValue({ id: 'booking-1', tenant_id: 'tenant-2', total_kobo: 5000 })

    await expect(
      controller.initializePayment({
        orderId: 'order-1',
        bookingId: 'booking-1',
        amountKobo: 5000,
        email: 'owner@example.com',
        provider: 'paystack',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('rejects payment initialization when the amount does not match the resource total', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'order-1', tenant_id: 'tenant-1', total_kobo: 5000 })

    await expect(
      controller.initializePayment({
        orderId: 'order-1',
        amountKobo: 4000,
        email: 'owner@example.com',
        provider: 'paystack',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
