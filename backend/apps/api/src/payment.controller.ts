import { Controller, Post, Get, Body, Query, Headers, HttpCode, HttpStatus, UnauthorizedException, Req, BadRequestException, ForbiddenException, UseGuards } from '@nestjs/common'
import { RawBodyRequest } from '@nestjs/common'
import { Request } from 'express'
import { PrismaClient } from '@prisma/client'
import { PaymentService } from '../../../libs/payments/payment.service'
import { PaymentProvider } from '../../../libs/payments/payment.service'
import { PaystackService } from '../../../libs/payments/paystack.service'
import { FlutterwaveService } from '../../../libs/payments/flutterwave.service'
import { WebhookHandler } from '../../../libs/payments/webhook.handler'
import { AuditLogger } from '../../../libs/monitoring/audit.logger'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'

@Controller('api/payments')
export class PaymentController {
  private readonly paymentService: PaymentService
  private readonly webhookHandler: WebhookHandler

  constructor(private readonly prisma: PrismaClient) {
    const auditLogger = new AuditLogger(prisma)
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY!
    const paystack = new PaystackService(paystackSecret)
    const flutterwave = process.env.FLUTTERWAVE_SECRET_KEY
      ? new FlutterwaveService(process.env.FLUTTERWAVE_SECRET_KEY)
      : undefined
    this.paymentService = new PaymentService(prisma, paystack, auditLogger, flutterwave)
    this.webhookHandler = new WebhookHandler(prisma, paystackSecret)
  }

  @Post('initialize')
  async initializePayment(
    @Body()
    body: {
      tenantId?: string
      amountKobo: number
      email: string
      provider: PaymentProvider
      orderId?: string
      bookingId?: string
    },
  ) {
    if (body.provider !== 'paystack' && body.provider !== 'flutterwave') {
      throw new BadRequestException('provider must be paystack or flutterwave')
    }
    if (!body.orderId && !body.bookingId) {
      throw new BadRequestException('orderId or bookingId is required')
    }

    const order = body.orderId
      ? await this.prisma.order.findUnique({ where: { id: body.orderId } })
      : null
    const booking = body.bookingId
      ? await this.prisma.booking.findUnique({ where: { id: body.bookingId } })
      : null

    const resource = order ?? booking
    if (!resource) {
      throw new BadRequestException('Referenced order or booking not found')
    }

    if (body.orderId && body.bookingId && order && booking && order.tenant_id !== booking.tenant_id) {
      throw new ForbiddenException('Cross-tenant payment initialization is not allowed')
    }

    if (body.amountKobo !== resource.total_kobo) {
      throw new BadRequestException('Payment amount does not match referenced resource total')
    }

    return this.paymentService.initializePayment(
      resource.tenant_id,
      body.amountKobo,
      body.email,
      body.provider,
      body.orderId,
      body.bookingId,
    )
  }

  @Get('verify')
  async verifyPayment(
    @Query('reference') reference: string,
    @Query('provider') provider: PaymentProvider,
  ) {
    return this.paymentService.verifyPayment(reference, provider ?? 'paystack')
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async checkPaymentStatus(
    @CurrentUser() user: any,
    @Query('orderId') orderId?: string,
    @Query('bookingId') bookingId?: string,
  ) {
    if (!user?.tenant_id || user.scope === 'SYSTEM') {
      throw new ForbiddenException('Tenant credentials required')
    }

    if (orderId) {
      const order = await this.prisma.order.findFirst({ where: { id: orderId, tenant_id: user.tenant_id } })
      if (!order) {
        throw new ForbiddenException('Order access denied')
      }
    }

    if (bookingId) {
      const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, tenant_id: user.tenant_id } })
      if (!booking) {
        throw new ForbiddenException('Booking access denied')
      }
    }

    const isPaid = await this.paymentService.isOrderOrBookingPaid(user.tenant_id, orderId, bookingId)
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
