import { PrismaClient, Order, OrderItem } from '@prisma/client';
import { Cart } from './cart.service';
import { AuditLogger } from '../monitoring/audit.logger';
import { MenuItemService } from './menu.service';
export interface CreateOrderResult {
    order: Order;
    items: OrderItem[];
}
export declare class OrderService {
    private readonly prisma;
    private readonly auditLogger;
    private readonly menuItemService;
    constructor(prisma: PrismaClient, auditLogger: AuditLogger, menuItemService: MenuItemService);
    createOrder(cart: Cart, branchId: string): Promise<CreateOrderResult>;
    getOrder(tenantId: string, branchId: string, orderId: string): Promise<Order | null>;
    listOrders(tenantId: string, branchId: string): Promise<Order[]>;
}
