import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaClient) {}

  async searchOrders(tenantId: string, query: string, limit = 20) {
    return this.prisma.order.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { id: { startsWith: query } },
          { customer_id: { startsWith: query } },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    })
  }

  async searchBookings(tenantId: string, query: string, limit = 20) {
    return this.prisma.booking.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { id: { startsWith: query } },
          { customer_id: { startsWith: query } },
          { room_type_id: { startsWith: query } },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    })
  }

  async searchCustomers(tenantId: string, query: string, limit = 20) {
    return this.prisma.customer.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { id: { startsWith: query } },
          { name: { startsWith: query } },
          { email: { startsWith: query } },
          { phone: { startsWith: query } },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    })
  }
}
