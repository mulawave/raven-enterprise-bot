import { Controller, Post, Body, Req, HttpCode, HttpStatus, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { Request } from 'express'
import { BroadcastLimiter } from './broadcast/broadcast.limiter'
import { OutboundMessageWorker } from '../../../apps/worker/messaging/outbound-message.worker'

@Controller('admin/broadcast')
export class AdminBroadcastController {
  private readonly logger = new Logger(AdminBroadcastController.name)

  constructor(
    private readonly prisma: PrismaClient,
    private readonly limiter: BroadcastLimiter,
    private readonly outboundWorker: OutboundMessageWorker,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(
    @Body() body: { channel?: string; message?: string },
    @Req() req: Request,
  ) {
    const tenantId = req.user?.tenant_id ?? 'unknown'
    const channel = (body.channel ?? 'whatsapp') as 'whatsapp' | 'instagram' | 'facebook'
    const content = body.message?.trim()

    if (!content) {
      return { error: { code: 'VALIDATION_ERROR', message: 'message is required' } }
    }

    this.limiter.assertCanSend(tenantId, channel)

    // Fetch all customers for this tenant that have a phone number (required for WhatsApp)
    const customers = await this.prisma.customer.findMany({
      where: { tenant_id: tenantId, phone: { not: null } },
      select: {
        id: true,
        phone: true,
        conversations: {
          where: { status: 'open' },
          orderBy: { updated_at: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    })

    let sent = 0

    for (const customer of customers) {
      const phone = customer.phone
      if (!phone) continue

      // Reuse open conversation, or open a new one
      let conversationId = customer.conversations[0]?.id
      if (!conversationId) {
        const conv = await this.prisma.conversation.create({
          data: { tenant_id: tenantId, customer_id: customer.id, status: 'open' },
        })
        conversationId = conv.id
      }

      try {
        await this.outboundWorker.enqueue({
          conversationId,
          tenantId,
          customerId: customer.id,
          content,
          platform: channel,
          to: phone,
        })
        sent++
      } catch (err) {
        this.logger.error(
          `Failed to enqueue broadcast for customer ${customer.id}: ${(err as Error).message}`,
        )
      }
    }

    this.limiter.recordSend(tenantId, channel)
    return { sent, tenantId, channel }
  }
}

