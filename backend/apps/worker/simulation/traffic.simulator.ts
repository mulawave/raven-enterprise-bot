type SimulatedChat = { sessionId: string; tenantId: string; userId: string; input: string; output: string }

type SimulatedOrder = { tenantId: string; customerId: string; items: { id: string; qty: number }[]; totalKobo: number; status: string }

type SimulatedBooking = { tenantId: string; customerId: string; roomTypeId: string; start: string; end: string; totalKobo: number; status: string }

type SimulatedPayment = { tenantId: string; reference: string; status: string }

export class TrafficSimulator {
  simulateChats(tenantId: string, count = 5): SimulatedChat[] {
    const chats: SimulatedChat[] = []
    for (let i = 0; i < count; i++) {
      const sessionId = `sim-session-${tenantId}-${i}`
      chats.push({
        sessionId,
        tenantId,
        userId: `sim-user-${i}`,
        input: `Hello ${i}`,
        output: 'Let me confirm that and get back to you.'
      })
    }
    return chats
  }

  simulateOrders(tenantId: string, count = 3): SimulatedOrder[] {
    const orders: SimulatedOrder[] = []
    for (let i = 0; i < count; i++) {
      orders.push({
        tenantId,
        customerId: `sim-customer-${i}`,
        items: [{ id: `item-${i}`, qty: 1 }],
        totalKobo: 1000,
        status: 'pending'
      })
    }
    return orders
  }

  simulateBookings(tenantId: string, count = 2): SimulatedBooking[] {
    const bookings: SimulatedBooking[] = []
    for (let i = 0; i < count; i++) {
      bookings.push({
        tenantId,
        customerId: `sim-customer-${i}`,
        roomTypeId: `room-${i}`,
        start: new Date().toISOString(),
        end: new Date(Date.now() + 86400000).toISOString(),
        totalKobo: 5000,
        status: 'pending'
      })
    }
    return bookings
  }

  simulatePaymentCallbacks(tenantId: string, count = 3): SimulatedPayment[] {
    const payments: SimulatedPayment[] = []
    for (let i = 0; i < count; i++) {
      payments.push({
        tenantId,
        reference: `sim-ref-${tenantId}-${i}`,
        status: 'success'
      })
    }
    return payments
  }
}
