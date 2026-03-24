import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ForbiddenException, NotFoundException, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { OrderService } from '../../../libs/ordering/order.service'
import { MenuItemService, MenuCategoryService } from '../../../libs/ordering/menu.service'
import { AuditLogger } from '../../../libs/monitoring/audit.logger'
import { Cart } from '../../../libs/ordering/cart.service'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'
import { StaffScopeService } from '../../../libs/auth/staff.scope.service'
import { NotificationService } from '../../../libs/notifications/notification.service'

@Controller('api/ordering')
export class OrderingController {
  private readonly orderService: OrderService
  private readonly menuItemService: MenuItemService
  private readonly menuCategoryService: MenuCategoryService

  constructor(
    private readonly prisma: PrismaClient,
    private readonly staffScopeService: StaffScopeService,
    private readonly notificationService: NotificationService,
  ) {
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

  // ── Authenticated menu management (tenant-facing) ───────────────────────

  @Post('menu/categories')
  @UseGuards(JwtAuthGuard)
  async createCategory(@CurrentUser() user: any, @Body() body: { name: string }) {
    if (!body?.name?.trim()) throw new ForbiddenException('Category name is required')
    try {
      return await this.menuCategoryService.createCategory(user.tenant_id, body)
    } catch (err) {
      throw new NotFoundException((err as Error).message)
    }
  }

  @Patch('menu/categories/:id')
  @UseGuards(JwtAuthGuard)
  async updateCategory(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { name: string }) {
    if (!body?.name?.trim()) throw new ForbiddenException('Category name is required')
    try {
      return await this.menuCategoryService.updateCategory(user.tenant_id, id, body)
    } catch (err) {
      throw new NotFoundException((err as Error).message)
    }
  }

  @Delete('menu/categories/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@CurrentUser() user: any, @Param('id') id: string) {
    try {
      await this.menuCategoryService.deleteCategory(user.tenant_id, id)
    } catch (err) {
      throw new NotFoundException((err as Error).message)
    }
  }

  @Post('menu/items')
  @UseGuards(JwtAuthGuard)
  async createMenuItem(
    @CurrentUser() user: any,
    @Body() body: { category_id: string; name: string; description?: string; price_kobo: number; available?: boolean },
  ) {
    if (!body?.category_id || !body?.name?.trim() || body?.price_kobo == null) {
      throw new ForbiddenException('category_id, name, and price_kobo are required')
    }
    try {
      return await this.menuItemService.createItem(user.tenant_id, body)
    } catch (err) {
      throw new NotFoundException((err as Error).message)
    }
  }

  @Patch('menu/items/:id')
  @UseGuards(JwtAuthGuard)
  async updateMenuItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; price_kobo?: number; available?: boolean; category_id?: string },
  ) {
    try {
      return await this.menuItemService.updateItem(user.tenant_id, id, body)
    } catch (err) {
      throw new NotFoundException((err as Error).message)
    }
  }

  @Delete('menu/items/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMenuItem(@CurrentUser() user: any, @Param('id') id: string) {
    try {
      await this.menuItemService.deleteItem(user.tenant_id, id)
    } catch (err) {
      throw new NotFoundException((err as Error).message)
    }
  }

  @Post('orders')
  async createOrder(@Body() body: { cart: Cart; branchId: string }) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: body.branchId, tenant_id: body.cart.tenantId },
    })
    if (!branch) {
      throw new ForbiddenException('Branch does not belong to tenant')
    }

    const order = await this.orderService.createOrder(body.cart, body.branchId)

    // Notify tenant users of new order (fire-and-forget)
    this.notificationService.send({
      tenantId: body.cart.tenantId,
      title: '🛒 New Order Received',
      body: `Order #${(order as any).id?.slice(-6).toUpperCase()} placed — review and confirm it.`,
      type: 'order_new',
      data: { orderId: (order as any).id ?? '', tenantId: body.cart.tenantId },
    }).catch(() => undefined)

    return order
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async listOrders(@CurrentUser() user: any, @Query('branchId') branchId?: string) {
    const { tenantId, branchIds } = await this.resolveTenantBranchScope(user, branchId)
    return this.orderService.listOrders(tenantId, branchIds)
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  async getOrder(
    @CurrentUser() user: any,
    @Param('id') orderId: string,
    @Query('branchId') branchId?: string,
  ) {
    const { tenantId, branchIds } = await this.resolveTenantBranchScope(user, branchId)
    return this.orderService.getOrder(tenantId, orderId, branchIds)
  }

  @Patch('orders/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateOrderStatus(
    @CurrentUser() user: any,
    @Param('id') orderId: string,
    @Body() body: { status: string },
  ) {
    const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']
    if (!body?.status || !VALID_STATUSES.includes(body.status)) {
      throw new ForbiddenException(`status must be one of: ${VALID_STATUSES.join(', ')}`)
    }
    if (!user?.tenant_id || user.scope === 'SYSTEM') {
      throw new ForbiddenException('Tenant credentials required')
    }
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenant_id: user.tenant_id },
    })
    if (!order) throw new NotFoundException('Order not found')

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: body.status, updated_at: new Date() },
    })
    // Audit
    await this.prisma.orderAudit.create({
      data: { tenant_id: user.tenant_id, order_id: orderId, status: body.status, user_id: user.id ?? user.sub ?? null },
    })

    // Notify tenant users of status change (fire-and-forget)
    this.notificationService.send({
      tenantId: user.tenant_id,
      title: '📦 Order Status Updated',
      body: `Order #${orderId.slice(-6).toUpperCase()} is now ${body.status}.`,
      type: 'order_status',
      data: { orderId, status: body.status },
    }).catch(() => undefined)

    return updated
  }

  private async resolveTenantBranchScope(user: any, requestedBranchId?: string) {
    if (!user?.tenant_id || user.scope === 'SYSTEM') {
      throw new ForbiddenException('Tenant credentials required')
    }

    if (user.role === 'staff') {
      const assignedBranchIds = await this.staffScopeService.getAssignedBranches(user.id ?? user.sub)
      if (assignedBranchIds.length === 0) {
        throw new ForbiddenException('No branch access assigned')
      }
      if (requestedBranchId && !assignedBranchIds.includes(requestedBranchId)) {
        throw new ForbiddenException('Branch access denied')
      }
      return {
        tenantId: user.tenant_id,
        branchIds: requestedBranchId ? [requestedBranchId] : assignedBranchIds,
      }
    }

    if (requestedBranchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: requestedBranchId, tenant_id: user.tenant_id },
      })
      if (!branch) {
        throw new ForbiddenException('Branch access denied')
      }
      return { tenantId: user.tenant_id, branchIds: [requestedBranchId] }
    }

    return { tenantId: user.tenant_id, branchIds: undefined as string[] | undefined }
  }
}
