import { PrismaClient, Order } from '@prisma/client'
import { AuditLogger } from '../monitoring/audit.logger'

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'

export class OrderStatusUpdater {
  constructor(private readonly prisma: PrismaClient, private readonly auditLogger: AuditLogger) {}

  async updateStatus(tenantId: string, orderId: string, status: OrderStatus): Promise<Order> {
    const order = await this.prisma.order.update({
      where: { id: orderId, tenant_id: tenantId },
      data: { status },
    })

    await this.auditLogger.log({
      tenant_id: tenantId,
      entity_id: orderId,
      action: `ORDER_STATUS_${status.toUpperCase()}`,
      timestamp: new Date(),
    })

    return order
  }
}
