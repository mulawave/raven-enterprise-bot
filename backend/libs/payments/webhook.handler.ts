import { PrismaClient } from '@prisma/client'
import { Logger } from '@nestjs/common'
import crypto from 'crypto'

interface PaystackWebhookEvent {
  event: string
  data: {
    reference: string
    status: 'success' | 'failed'
    amount: number
    [key: string]: any
  }
}

export class WebhookHandler {
  private readonly logger = new Logger('WebhookHandler')
  private readonly processed: Set<string> = new Set()

  constructor(
    private readonly prisma: PrismaClient,
    private readonly paystackSecret: string,
  ) {}

  verifyPaystackSignature(payload: string, signature: string): boolean {
    const hash = crypto.createHmac('sha512', this.paystackSecret).update(payload).digest('hex')
    return hash === signature
  }

  async handlePaystackWebhook(event: PaystackWebhookEvent): Promise<void> {
    if (event.event !== 'charge.success') {
      return
    }

    const ref = event.data.reference

    if (!ref || this.processed.has(ref)) {
      this.logger.warn(`Duplicate or invalid reference: ${ref}`)
      return
    }

    this.processed.add(ref)

    const status = event.data.status === 'success' ? 'paid' : 'failed'

    const payment = await this.prisma.payment.findFirst({
      where: { reference: ref },
    })

    if (!payment) {
      this.logger.error(`Payment not found for reference: ${ref}`)
      return
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status },
    })

    if (status === 'paid' && payment.order_id) {
      await this.prisma.order.update({
        where: { id: payment.order_id },
        data: { status: 'confirmed' },
      })
    }

    if (status === 'paid' && payment.booking_id) {
      await this.prisma.booking.update({
        where: { id: payment.booking_id },
        data: { status: 'confirmed' },
      })
    }

    await this.prisma.paymentAudit.create({
      data: {
        tenant_id: payment.tenant_id,
        payment_id: payment.id,
        status,
        reference: ref,
      },
    })
  }
}
