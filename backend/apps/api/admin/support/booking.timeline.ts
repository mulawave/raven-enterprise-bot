export class BookingTimelineViewer {
  async view(prisma: any, tenantId: string, bookingId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, tenant_id: tenantId },
      include: { roomType: true, payments: true },
    })
    if (!booking) return { tenantId, bookingId, booking: null, timeline: [] }
    const timeline: Array<Record<string, any>> = []
    timeline.push({
      type: 'BOOKING_CREATED',
      at: booking.created_at,
      status: booking.status,
      total_kobo: booking.total_kobo,
      start_date: booking.start_date,
      end_date: booking.end_date,
    })
    if (booking.updated_at && booking.updated_at.getTime() !== booking.created_at.getTime()) {
      timeline.push({
        type: 'BOOKING_UPDATED',
        at: booking.updated_at,
        status: booking.status,
        total_kobo: booking.total_kobo,
        start_date: booking.start_date,
        end_date: booking.end_date,
      })
    }
    for (const payment of booking.payments) {
      timeline.push({
        type: 'PAYMENT',
        at: payment.created_at,
        status: payment.status,
        amount_kobo: payment.amount_kobo,
        reference: payment.reference,
      })
    }
    timeline.sort((a, b) => a.at.getTime() - b.at.getTime())
    return { tenantId, bookingId, booking, timeline }
  }
}
