import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../libs/auth/guards/super-admin.guard'

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminOrdersController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  async list(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    const skip = (Number(page) - 1) * Number(limit)
    const where = {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(status ? { status } : {}),
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          tenant: { select: { id: true, name: true } },
          orderItems: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.order.count({ where }),
    ])

    return { orders, total, page: Number(page), limit: Number(limit) }
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        tenant: { select: { id: true, name: true } },
        orderItems: true,
      },
    })
  }
}
