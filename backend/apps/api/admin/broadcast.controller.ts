import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { Request } from 'express'
import { BroadcastLimiter } from './broadcast/broadcast.limiter'

@Controller('admin/broadcast')
export class AdminBroadcastController {
  private readonly limiter = new BroadcastLimiter({
    perTenant: { limit: 100, windowMs: 60_000 },
    perChannel: { whatsapp: { limit: 50, windowMs: 60_000 } },
  })

  constructor(private readonly prisma: PrismaClient) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(
    @Body() body: { channel?: string; message?: string },
    @Req() req: Request,
  ) {
    const tenantId = req.user?.tenant_id ?? 'unknown'
    const channel = body.channel ?? 'whatsapp'
    this.limiter.assertCanSend(tenantId, channel)
    // TODO Phase 5: enqueue outbound broadcast job via BullMQ
    this.limiter.recordSend(tenantId, channel)
    return { sent: 0, tenantId, channel }
  }
}
