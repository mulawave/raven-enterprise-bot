"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
class OrderService {
    constructor(prisma, auditLogger, menuItemService) {
        this.prisma = prisma;
        this.auditLogger = auditLogger;
        this.menuItemService = menuItemService;
    }
    async createOrder(cart, branchId) {
        if (cart.items.length === 0) {
            throw new Error('ORDER_EMPTY_CART');
        }
        let totalKobo = 0;
        const itemsData = [];
        for (const cartItem of cart.items) {
            const menuItem = await this.menuItemService.getItemById(cart.tenantId, cartItem.itemId);
            if (!menuItem) {
                throw new Error(`MENU_ITEM_NOT_FOUND: ${cartItem.itemId}`);
            }
            if (!menuItem.available) {
                throw new Error(`MENU_ITEM_UNAVAILABLE: ${cartItem.itemId}`);
            }
            const lineTotal = menuItem.price_kobo * cartItem.quantity;
            totalKobo += lineTotal;
            itemsData.push({
                menu_item_id: menuItem.id,
                quantity: cartItem.quantity,
                price_kobo: menuItem.price_kobo,
            });
        }
        const order = await this.prisma.order.create({
            data: {
                tenant_id: cart.tenantId,
                branch_id: branchId,
                customer_id: cart.customerId,
                total_kobo: totalKobo,
                status: 'pending',
            },
        });
        const orderItems = await Promise.all(itemsData.map((item) => this.prisma.orderItem.create({
            data: {
                tenant_id: cart.tenantId,
                order_id: order.id,
                ...item,
            },
        })));
        await this.auditLogger.log({
            tenant_id: cart.tenantId,
            entity_id: order.id,
            action: 'ORDER_CREATED',
            timestamp: new Date(),
        });
        return { order, items: orderItems };
    }
    async getOrder(tenantId, branchId, orderId) {
        return this.prisma.order.findFirst({
            where: { id: orderId, tenant_id: tenantId, branch_id: branchId },
            include: { orderItems: true },
        });
    }
    async listOrders(tenantId, branchId) {
        return this.prisma.order.findMany({
            where: { tenant_id: tenantId, branch_id: branchId },
            include: { orderItems: true, customer: true },
            orderBy: { created_at: 'desc' },
        });
    }
}
exports.OrderService = OrderService;
