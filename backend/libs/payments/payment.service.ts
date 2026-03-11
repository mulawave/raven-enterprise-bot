import { PrismaClient, Payment } from '@prisma/client'
import { PaystackService } from './paystack.service'
import { FlutterwaveService } from './flutterwave.service'
import { AuditLogger } from '../monitoring/audit.logger'

export type PaymentProvider = 'paystack' | 'flutterwave'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled'

export interface InitializePaymentResult {
  payment: Payment
  authorizationUrl: string
  accessCode?: string
}

export class PaymentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly paystack: PaystackService,
    private readonly auditLogger: AuditLogger,
    private readonly flutterwave?: FlutterwaveService,
  ) {}

  async initializePayment(
    tenantId: string,
    amountKobo: number,
    email: string,
    provider: PaymentProvider,
    orderId?: string,
    bookingId?: string,
  ): Promise<InitializePaymentResult> {
    if (!orderId && !bookingId) {
      throw new Error('PAYMENT_REQUIRES_ORDER_OR_BOOKING')
    }
    if (orderId && bookingId) {
      throw new Error('PAYMENT_MUST_REFERENCE_EXACTLY_ONE: provide either orderId or bookingId, not both')
    }

    const reference = `${tenantId}-${Date.now()}-${Math.random().toString(36).substring(7)}`

    const payment = await this.prisma.payment.create({
      data: {
        tenant_id: tenantId,
        order_id: orderId,
        booking_id: bookingId,
        amount_kobo: amountKobo,
        status: 'pending',
        reference,
        provider,
      },
    })

    await this.auditLogger.log({
      tenant_id: tenantId,
      entity_id: payment.id,
      action: 'PAYMENT_INITIALIZED',
      timestamp: new Date(),
    })

    const callbackBase = process.env.PAYMENT_CALLBACK_URL || 'http://localhost:3000'

    if (provider === 'paystack') {
      const result = await this.paystack.initialize(
        amountKobo,
        email,
        reference,
        `${callbackBase}/payment/callback`,
      )
      return {
        payment,
        authorizationUrl: result.data.authorization_url,
        accessCode: result.data.access_code,
      }
    }

    if (provider === 'flutterwave') {
      if (!this.flutterwave) throw new Error('FLUTTERWAVE_NOT_CONFIGURED')
      const result = await this.flutterwave.initialize(
        amountKobo,
        email,
        reference,
        `${callbackBase}/payment/callback?provider=flutterwave`,
      )
      return {
        payment,
        authorizationUrl: result.data?.link ?? result.link,
      }
    }

    throw new Error('PAYMENT_PROVIDER_NOT_SUPPORTED')
  }

  async verifyPayment(reference: string, provider: PaymentProvider): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({ where: { reference } })

    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND')
    }

    if (provider === 'paystack') {
      const result = await this.paystack.verify(reference)
      if (result.data.status === 'success') {
        return this.updatePaymentStatus(payment.tenant_id, payment.id, 'paid')
      } else {
        return this.updatePaymentStatus(payment.tenant_id, payment.id, 'failed')
      }
    }

    if (provider === 'flutterwave') {
      if (!this.flutterwave) throw new Error('FLUTTERWAVE_NOT_CONFIGURED')
      // For Flutterwave, tx_id is passed as reference after redirect
      const result = await this.flutterwave.verify(reference)
      if (result.data?.status === 'successful') {
        return this.updatePaymentStatus(payment.tenant_id, payment.id, 'paid')
      } else {
        return this.updatePaymentStatus(payment.tenant_id, payment.id, 'failed')
      }
    }

    throw new Error('PAYMENT_PROVIDER_NOT_SUPPORTED')
  }

  async updatePaymentStatus(tenantId: string, paymentId: string, status: PaymentStatus): Promise<Payment> {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId, tenant_id: tenantId },
      data: { status },
    })

    await this.auditLogger.log({
      tenant_id: tenantId,
      entity_id: paymentId,
      action: `PAYMENT_STATUS_${status.toUpperCase()}`,
      timestamp: new Date(),
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

    return payment
  }

  async isOrderOrBookingPaid(tenantId: string, orderId?: string, bookingId?: string): Promise<boolean> {
    if (orderId) {
      const payment = await this.prisma.payment.findFirst({
        where: { tenant_id: tenantId, order_id: orderId, status: 'paid' },
      })
      return !!payment
    }

    if (bookingId) {
      const payment = await this.prisma.payment.findFirst({
        where: { tenant_id: tenantId, booking_id: bookingId, status: 'paid' },
      })
      return !!payment
    }

    return false
  }
}
