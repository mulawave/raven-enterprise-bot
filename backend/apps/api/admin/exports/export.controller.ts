import { Controller, Post, Get, Param, Query, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { ExportService } from './export.service'

@Controller('admin/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  async startExport(
    @Query('format') fmt: string,
    @Req() req: Request,
  ) {
    const tenantId = req.user?.tenant_id
    if (!tenantId) return { error: 'Forbidden' }
    const format = fmt === 'csv' ? 'csv' : 'json'
    return this.exportService.startExportJob(tenantId, format)
  }

  @Get(':jobId')
  async getExportResult(
    @Param('jobId') jobId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const tenantId = req.user?.tenant_id
    if (!tenantId) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    const format = jobId.endsWith('csv') ? 'csv' : 'json'
    const result = await this.exportService.exportTenantData(tenantId, format)
    res.setHeader('Content-Type', result.mime)
    res.send(result.content)
  }
}
