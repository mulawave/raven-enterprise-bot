import { PrismaClient, Payment } from '@prisma/client'
import { PaystackService } from './paystack.service'
import { AuditLogger } from '../monitoring/audit.logger'

export type PaymentProvider = 'paystack'
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

    if (provider === 'paystack') {
      const result = await this.paystack.initialize(
        amountKobo,
        email,
        reference,
        `${process.env.PAYMENT_CALLBACK_URL || 'http://localhost:3000'}/payment/callback`,
      )

      return {
        payment,
        authorizationUrl: result.data.authorization_url,
        accessCode: result.data.access_code,
      }
    }

    throw new Error('PAYMENT_PROVIDER_NOT_SUPPORTED')
  }

  async verifyPayment(tenantId: string, reference: string, provider: PaymentProvider): Promise<Payment> {
    const payment = await this.prisma.payment.findFirst({
      where: { tenant_id: tenantId, reference },
    })

    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND')
    }

    if (provider === 'paystack') {
      const result = await this.paystack.verify(reference)

      if (result.data.status === 'success') {
        return this.updatePaymentStatus(tenantId, payment.id, 'paid')
      } else {
        return this.updatePaymentStatus(tenantId, payment.id, 'failed')
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
