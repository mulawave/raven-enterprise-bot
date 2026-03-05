import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../libs/auth/guards/super-admin.guard'

@Controller('admin/customers')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminCustomersController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  async list(
    @Query('tenantId') tenantId?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    const skip = (Number(page) - 1) * Number(limit)
    const where = {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true } },
          _count: { select: { conversations: true, orders: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.customer.count({ where }),
    ])

    return { customers, total, page: Number(page), limit: Number(limit) }
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true } },
        conversations: { orderBy: { created_at: 'desc' }, take: 5 },
        orders: { orderBy: { created_at: 'desc' }, take: 5 },
        _count: { select: { conversations: true, orders: true } },
      },
    })
  }
}
