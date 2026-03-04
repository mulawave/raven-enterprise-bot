import { PrismaClient, Order, OrderItem } from '@prisma/client'
import { Cart } from './cart.service'
import { AuditLogger } from '../monitoring/audit.logger'
import { MenuItemService } from './menu.service'

export interface CreateOrderResult {
  order: Order
  items: OrderItem[]
}

export class OrderService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogger: AuditLogger,
    private readonly menuItemService: MenuItemService,
  ) {}

  async createOrder(cart: Cart, branchId: string): Promise<CreateOrderResult> {
    if (cart.items.length === 0) {
      throw new Error('ORDER_EMPTY_CART')
    }

    let totalKobo = 0
    const itemsData: Array<{ menu_item_id: string; quantity: number; price_kobo: number }> = []

    for (const cartItem of cart.items) {
      const menuItem = await this.menuItemService.getItemById(cart.tenantId, cartItem.itemId)
      if (!menuItem) {
        throw new Error(`MENU_ITEM_NOT_FOUND: ${cartItem.itemId}`)
      }
      if (!menuItem.available) {
        throw new Error(`MENU_ITEM_UNAVAILABLE: ${cartItem.itemId}`)
      }
      const lineTotal = menuItem.price_kobo * cartItem.quantity
      totalKobo += lineTotal
      itemsData.push({
        menu_item_id: menuItem.id,
        quantity: cartItem.quantity,
        price_kobo: menuItem.price_kobo,
      })
    }

    const order = await this.prisma.order.create({
      data: {
        tenant_id: cart.tenantId,
        branch_id: branchId,
        customer_id: cart.customerId,
        total_kobo: totalKobo,
        status: 'pending',
      },
    })

    const orderItems = await Promise.all(
      itemsData.map((item) =>
        this.prisma.orderItem.create({
          data: {
            tenant_id: cart.tenantId,
            order_id: order.id,
            ...item,
          },
        }),
      ),
    )

    await this.auditLogger.log({
      tenant_id: cart.tenantId,
      entity_id: order.id,
      action: 'ORDER_CREATED',
      timestamp: new Date(),
    })

    return { order, items: orderItems }
  }

  async getOrder(tenantId: string, branchId: string, orderId: string): Promise<Order | null> {
    return this.prisma.order.findFirst({
      where: { id: orderId, tenant_id: tenantId, branch_id: branchId },
      include: { orderItems: true },
    })
  }

  async listOrders(tenantId: string, branchId: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { tenant_id: tenantId, branch_id: branchId },
      include: { orderItems: true, customer: true },
      orderBy: { created_at: 'desc' },
    })
  }
}
