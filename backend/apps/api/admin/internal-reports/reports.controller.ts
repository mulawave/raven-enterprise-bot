import { Controller, Get } from '@nestjs/common'
import { ReportsService } from './reports.service'

@Controller('admin/internal-reports')
export class InternalReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('ai-usage')
  async aiUsage() {
    return this.reportsService.aiUsagePerTenant()
  }

  @Get('messaging-volume')
  async messagingVolume() {
    return this.reportsService.messagingVolumePerChannel()
  }

  @Get('payment-volume')
  async paymentVolume() {
    return this.reportsService.paymentProcessingVolume()
  }
}
