import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { OrderService } from '../../../libs/ordering/order.service'
import { MenuItemService, MenuCategoryService } from '../../../libs/ordering/menu.service'
import { AuditLogger } from '../../../libs/monitoring/audit.logger'
import { Cart } from '../../../libs/ordering/cart.service'

@Controller('api/ordering')
export class OrderingController {
  private readonly orderService: OrderService
  private readonly menuItemService: MenuItemService
  private readonly menuCategoryService: MenuCategoryService

  constructor(private readonly prisma: PrismaClient) {
    const auditLogger = new AuditLogger(prisma)
    this.menuItemService = new MenuItemService(prisma)
    this.orderService = new OrderService(prisma, auditLogger, this.menuItemService)
    this.menuCategoryService = new MenuCategoryService(prisma)
  }

  @Get('menu/categories')
  async getCategories(@Query('tenantId') tenantId: string) {
    return this.menuCategoryService.getCategories(tenantId)
  }

  @Get('menu/items')
  async getMenuItems(@Query('tenantId') tenantId: string, @Query('categoryId') categoryId?: string) {
    return this.menuItemService.getItems(tenantId, categoryId)
  }

  @Post('orders')
  async createOrder(@Body() body: { cart: Cart; branchId: string }) {
    return this.orderService.createOrder(body.cart, body.branchId)
  }

  @Get('orders')
  async listOrders(@Query('tenantId') tenantId: string, @Query('branchId') branchId: string) {
    return this.orderService.listOrders(tenantId, branchId)
  }

  @Get('orders/:id')
  async getOrder(
    @Param('id') orderId: string,
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId: string,
  ) {
    return this.orderService.getOrder(tenantId, branchId, orderId)
  }
}
