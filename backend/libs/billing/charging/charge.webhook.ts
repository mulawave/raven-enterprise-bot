import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class ChargeWebhookHandler {
  constructor(private readonly prisma: PrismaClient) {}

  async handleWebhook(event: Record<string, unknown>): Promise<void> {
    const data = event.data as Record<string, unknown> | undefined
    const ref = (data?.reference ?? data?.tx_ref) as string | undefined
    const status = data?.status as string | undefined
    if (!ref) return
    const invoice = await this.prisma.invoice.findFirst({ where: { reference: ref } })
    if (!invoice) return
    const newStatus = (status === 'success' || status === 'successful') ? 'paid' : 'failed'
    await this.prisma.invoice.update({ where: { id: invoice.id }, data: { status: newStatus } })
  }
}
