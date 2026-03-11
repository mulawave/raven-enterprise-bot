import { Controller, Get, Post, Body, Param, Query, ForbiddenException, UseGuards } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { OrderService } from '../../../libs/ordering/order.service'
import { MenuItemService, MenuCategoryService } from '../../../libs/ordering/menu.service'
import { AuditLogger } from '../../../libs/monitoring/audit.logger'
import { Cart } from '../../../libs/ordering/cart.service'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'
import { StaffScopeService } from '../../../libs/auth/staff.scope.service'

@Controller('api/ordering')
export class OrderingController {
  private readonly orderService: OrderService
  private readonly menuItemService: MenuItemService
  private readonly menuCategoryService: MenuCategoryService

  constructor(
    private readonly prisma: PrismaClient,
    private readonly staffScopeService: StaffScopeService,
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

  @Post('orders')
  async createOrder(@Body() body: { cart: Cart; branchId: string }) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: body.branchId, tenant_id: body.cart.tenantId },
    })
    if (!branch) {
      throw new ForbiddenException('Branch does not belong to tenant')
    }

    return this.orderService.createOrder(body.cart, body.branchId)
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
