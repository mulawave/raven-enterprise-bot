import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { Request } from 'express'

@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get('summary')
  async summary(@Req() req: Request) {
    const tenantId = req.user?.tenant_id ?? null
    const [orders, bookings, customers] = await Promise.all([
      this.prisma.order.count({ where: { tenant_id: tenantId ?? undefined } }),
      this.prisma.booking.count({ where: { tenant_id: tenantId ?? undefined } }),
      this.prisma.customer.count({ where: { tenant_id: tenantId ?? undefined } }),
    ])
    return { orders, bookings, customers }
  }
}
