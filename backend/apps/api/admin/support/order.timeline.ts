export class OrderTimelineViewer {
  async view(prisma: any, tenantId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenant_id: tenantId },
      include: { orderItems: true, payments: true },
    })
    if (!order) return { tenantId, orderId, order: null, timeline: [] }
    const timeline: Array<Record<string, any>> = []
    timeline.push({
      type: 'ORDER_CREATED',
      at: order.created_at,
      status: order.status,
      total_kobo: order.total_kobo,
    })
    if (order.updated_at && order.updated_at.getTime() !== order.created_at.getTime()) {
      timeline.push({
        type: 'ORDER_UPDATED',
        at: order.updated_at,
        status: order.status,
        total_kobo: order.total_kobo,
      })
    }
    for (const payment of order.payments) {
      timeline.push({
        type: 'PAYMENT',
        at: payment.created_at,
        status: payment.status,
        amount_kobo: payment.amount_kobo,
        reference: payment.reference,
      })
    }
    timeline.sort((a, b) => a.at.getTime() - b.at.getTime())
    return { tenantId, orderId, order, timeline }
  }
}
