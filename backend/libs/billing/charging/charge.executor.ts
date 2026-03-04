import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PaystackService } from '../../payments/paystack.service'
import { FlutterwaveService } from '../../payments/flutterwave.service'

@Injectable()
export class ChargeExecutor {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly paystack: PaystackService,
    private readonly flutterwave: FlutterwaveService,
  ) {}

  async executeCharge(
    invoiceId: string,
    provider: 'paystack' | 'flutterwave',
    email: string,
    reference: string,
  ): Promise<{ status: string }> {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId } })
    if (!invoice || invoice.status !== 'pending') return { status: 'skipped' }
    if (provider === 'paystack') {
      await this.paystack.initialize(invoice.amount, email, reference, '')
    } else {
      await this.flutterwave.initialize(invoice.amount, email, reference, '')
    }
    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'charged', reference } })
    return { status: 'charged' }
  }
}
