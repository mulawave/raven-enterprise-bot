import { Controller, Get, Param, Req } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { Request } from 'express'

@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  async list(@Req() req: Request) {
    const tenantId = req.user?.tenant_id
    return this.prisma.order.findMany({
      where: { tenant_id: tenantId ?? undefined },
      include: { orderItems: true },
      orderBy: { created_at: 'desc' },
    })
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req: Request) {
    const tenantId = req.user?.tenant_id
    return this.prisma.order.findFirst({
      where: { id, tenant_id: tenantId ?? undefined },
      include: { orderItems: true },
    })
  }
}
