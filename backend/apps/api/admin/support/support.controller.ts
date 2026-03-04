import { Controller, Get, Query } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Controller('admin/support')
export class AdminSupportController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get('conversations')
  async getConversations(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
  ) {
    const conversations = await this.prisma.conversation.findMany({
      where: { tenant_id: tenantId, customer_id: userId },
      orderBy: { updated_at: 'desc' },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
          select: { id: true, sender_type: true, sender_id: true, content: true, created_at: true },
        },
      },
    })
    return { tenantId, userId, conversations }
  }

  @Get('orders')
  async getOrderTimeline(
    @Query('tenantId') tenantId: string,
    @Query('orderId') orderId: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenant_id: tenantId },
      include: { orderItems: true, payments: true },
    })
    if (!order) return { tenantId, orderId, order: null, timeline: [] }
    const timeline: Array<Record<string, unknown>> = [
      { type: 'ORDER_CREATED', at: order.created_at, status: order.status, total_kobo: order.total_kobo },
    ]
    if (order.updated_at.getTime() !== order.created_at.getTime()) {
      timeline.push({ type: 'ORDER_UPDATED', at: order.updated_at, status: order.status, total_kobo: order.total_kobo })
    }
    for (const p of order.payments) {
      timeline.push({ type: 'PAYMENT', at: p.created_at, status: p.status, amount_kobo: p.amount_kobo, reference: p.reference })
    }
    timeline.sort((a, b) => new Date(a.at as string).getTime() - new Date(b.at as string).getTime())
    return { tenantId, orderId, order, timeline }
  }

  @Get('bookings')
  async getBookingTimeline(
    @Query('tenantId') tenantId: string,
    @Query('bookingId') bookingId: string,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenant_id: tenantId },
      include: { roomType: true, payments: true },
    })
    if (!booking) return { tenantId, bookingId, booking: null, timeline: [] }
    const timeline: Array<Record<string, unknown>> = [
      { type: 'BOOKING_CREATED', at: booking.created_at, status: booking.status, total_kobo: booking.total_kobo },
    ]
    if (booking.updated_at.getTime() !== booking.created_at.getTime()) {
      timeline.push({ type: 'BOOKING_UPDATED', at: booking.updated_at, status: booking.status, total_kobo: booking.total_kobo })
    }
    for (const p of booking.payments) {
      timeline.push({ type: 'PAYMENT', at: p.created_at, status: p.status, amount_kobo: p.amount_kobo, reference: p.reference })
    }
    timeline.sort((a, b) => new Date(a.at as string).getTime() - new Date(b.at as string).getTime())
    return { tenantId, bookingId, booking, timeline }
  }
}
