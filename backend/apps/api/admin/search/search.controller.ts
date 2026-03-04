import { Controller, Get, Query, Req } from '@nestjs/common'
import { Request } from 'express'
import { SearchService } from './search.service'

@Controller('admin/search')
export class AdminSearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('orders')
  async searchOrders(@Query('q') q = '', @Req() req: Request) {
    const tenantId = req.user?.tenant_id ?? ''
    return this.searchService.searchOrders(tenantId, q)
  }

  @Get('bookings')
  async searchBookings(@Query('q') q = '', @Req() req: Request) {
    const tenantId = req.user?.tenant_id ?? ''
    return this.searchService.searchBookings(tenantId, q)
  }

  @Get('customers')
  async searchCustomers(@Query('q') q = '', @Req() req: Request) {
    const tenantId = req.user?.tenant_id ?? ''
    return this.searchService.searchCustomers(tenantId, q)
  }
}
