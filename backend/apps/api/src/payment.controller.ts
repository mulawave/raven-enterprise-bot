import { Controller, Post, Get, Body, Query, Headers, HttpCode, HttpStatus, UnauthorizedException, Req } from '@nestjs/common'
import { RawBodyRequest } from '@nestjs/common'
import { Request } from 'express'
import { PrismaClient } from '@prisma/client'
import { PaymentService } from '../../../libs/payments/payment.service'
import { PaystackService } from '../../../libs/payments/paystack.service'
import { WebhookHandler } from '../../../libs/payments/webhook.handler'
import { AuditLogger } from '../../../libs/monitoring/audit.logger'

@Controller('api/payments')
export class PaymentController {
  private readonly paymentService: PaymentService
  private readonly webhookHandler: WebhookHandler

  constructor(private readonly prisma: PrismaClient) {
    const auditLogger = new AuditLogger(prisma)
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY!
    const paystack = new PaystackService(paystackSecret)
    this.paymentService = new PaymentService(prisma, paystack, auditLogger)
    this.webhookHandler = new WebhookHandler(prisma, paystackSecret)
  }

  @Post('initialize')
  async initializePayment(
    @Body()
    body: {
      tenantId: string
      amountKobo: number
      email: string
      provider: 'paystack'
      orderId?: string
      bookingId?: string
    },
  ) {
    return this.paymentService.initializePayment(
      body.tenantId,
      body.amountKobo,
      body.email,
      body.provider,
      body.orderId,
      body.bookingId,
    )
  }

  @Get('verify')
  async verifyPayment(
    @Query('tenantId') tenantId: string,
    @Query('reference') reference: string,
    @Query('provider') provider: 'paystack',
  ) {
    return this.paymentService.verifyPayment(tenantId, reference, provider)
  }

  @Get('status')
  async checkPaymentStatus(
    @Query('tenantId') tenantId: string,
    @Query('orderId') orderId?: string,
    @Query('bookingId') bookingId?: string,
  ) {
    const isPaid = await this.paymentService.isOrderOrBookingPaid(tenantId, orderId, bookingId)
    return { isPaid }
  }

  @Post('webhook/paystack')
  @HttpCode(HttpStatus.OK)
  async paystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const rawBody = req.rawBody
    if (!rawBody) {
      throw new UnauthorizedException('Missing request body')
    }

    const isValid = this.webhookHandler.verifyPaystackSignature(rawBody.toString(), signature || '')
    if (!isValid) {
      throw new UnauthorizedException('Invalid Paystack signature')
    }

    await this.webhookHandler.handlePaystackWebhook(JSON.parse(rawBody.toString()))
    return { status: 'processed' }
  }
}
