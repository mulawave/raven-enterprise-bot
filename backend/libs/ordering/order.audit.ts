import { PrismaClient, OrderAudit } from '@prisma/client'

export class OrderAuditLog {
  constructor(private readonly prisma: PrismaClient) {}

  async log(tenantId: string, orderId: string, status: string, userId?: string): Promise<OrderAudit> {
    return this.prisma.orderAudit.create({
      data: {
        tenant_id: tenantId,
        order_id: orderId,
        status,
        user_id: userId,
      },
    })
  }
}
