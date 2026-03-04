import { Controller, Get, Query, Req } from '@nestjs/common'
import { Request } from 'express'
import { EnterpriseReportsService } from './enterprise.reports.service'

@Controller('admin/enterprise-reports')
export class EnterpriseReportsController {
  constructor(private readonly service: EnterpriseReportsService) {}

  @Get('conversations')
  async exportConversations(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Req() req: Request,
  ) {
    const tenantId = req.user?.tenant_id ?? ''
    return this.service.exportConversations(tenantId, Number(page) || 1, Number(pageSize) || 100)
  }

  @Get('revenue-by-branch')
  async revenueByBranch(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Req() req: Request,
  ) {
    const tenantId = req.user?.tenant_id ?? ''
    return this.service.revenueByBranch(tenantId, Number(page) || 1, Number(pageSize) || 50)
  }

  @Get('sla-compliance')
  async slaCompliance(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Req() req: Request,
  ) {
    const tenantId = req.user?.tenant_id ?? ''
    return this.service.slaCompliance(tenantId, Number(page) || 1, Number(pageSize) || 100)
  }
}
