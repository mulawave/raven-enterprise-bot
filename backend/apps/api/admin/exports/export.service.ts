import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { parse } from 'json2csv'

type ExportFormat = 'csv' | 'json'

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaClient) {}

  async exportTenantData(tenantId: string, format: ExportFormat): Promise<{ content: string; mime: string }> {
    const [orders, bookings, customers, payments] = await this.prisma.$transaction([
      this.prisma.order.findMany({ where: { tenant_id: tenantId } }),
      this.prisma.booking.findMany({ where: { tenant_id: tenantId } }),
      this.prisma.customer.findMany({ where: { tenant_id: tenantId } }),
      this.prisma.payment.findMany({ where: { tenant_id: tenantId } }),
    ])
    const exportObj = { orders, bookings, customers, payments }
    if (format === 'json') {
      return { content: JSON.stringify(exportObj, null, 2), mime: 'application/json' }
    }
    const csv = (parse as (data: unknown) => string)(exportObj)
    return { content: csv, mime: 'text/csv' }
  }

  async startExportJob(tenantId: string, format: ExportFormat): Promise<{ jobId: string }> {
    const jobId = `${tenantId}-${Date.now()}-${format}`
    // Fire-and-forget: run the export asynchronously. Replace with BullMQ job in Phase 5.
    void this.exportTenantData(tenantId, format)
    return { jobId }
  }
}
