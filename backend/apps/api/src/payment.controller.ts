import { Controller, Post, Get, Patch, Param, Body, Query, Headers, HttpCode, HttpStatus, UnauthorizedException, Req, Res, BadRequestException, ForbiddenException, UseGuards, Logger } from '@nestjs/common'
import { RawBodyRequest } from '@nestjs/common'
import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { PaymentService } from '../../../libs/payments/payment.service'
import { PaymentProvider } from '../../../libs/payments/payment.service'
import { PaystackService } from '../../../libs/payments/paystack.service'
import { FlutterwaveService } from '../../../libs/payments/flutterwave.service'
import { WebhookHandler } from '../../../libs/payments/webhook.handler'
import { AuditLogger } from '../../../libs/monitoring/audit.logger'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'
import { OrderFulfillmentService } from '../../../libs/fulfillment/order-fulfillment.service'
import { EmailService } from '../../../libs/email/email.service'
import { NotificationService } from '../../../libs/notifications/notification.service'

@Controller('api/payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name)
  private readonly fulfillmentService: OrderFulfillmentService

  constructor(
    private readonly prisma: PrismaClient,
    private readonly configLoader: ConfigLoaderService,
    private readonly notificationService: NotificationService,
  ) {
    this.fulfillmentService = new OrderFulfillmentService(prisma, new EmailService(configLoader), configLoader)
  }

  /** Resolves Paystack + Flutterwave services from DB-stored keys at call time */
  private async resolvePaymentServices() {
    const paystackSecret = await this.configLoader.getPaystackSecret()
    const flutterwaveSecret = await this.configLoader.getFlutterwaveSecret()
    const paystack = new PaystackService(paystackSecret)
    const flutterwave = flutterwaveSecret ? new FlutterwaveService(flutterwaveSecret) : undefined
    const auditLogger = new AuditLogger(this.prisma)
    const paymentService = new PaymentService(this.prisma, paystack, auditLogger, flutterwave, this.configLoader)
    const webhookHandler = new WebhookHandler(this.prisma, paystackSecret)
    return { paymentService, webhookHandler, paystack }
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

    const { paymentService } = await this.resolvePaymentServices()
    return paymentService.initializePayment(
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
    const { paymentService } = await this.resolvePaymentServices()
    return paymentService.verifyPayment(reference, provider ?? 'paystack')
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

    const { paymentService } = await this.resolvePaymentServices()
    const isPaid = await paymentService.isOrderOrBookingPaid(user.tenant_id, orderId, bookingId)
    return { isPaid }
  }

  @Get('callback')
  async paymentCallback(
    @Query('reference') reference: string,
    @Query('trxref') trxref: string,
    @Res() res: Response,
  ): Promise<void> {
    const ref = reference || trxref
    if (!ref) {
      res.status(400).send(this.callbackHtml('error', 'Missing payment reference', null))
      return
    }

    try {
      // Verify with Paystack — must always verify, never trust browser redirect alone
      const { paystack } = await this.resolvePaymentServices()
      const verification = await paystack.verify(ref)
      if (verification?.data?.status !== 'success') {
        res.send(this.callbackHtml('failed', 'Payment was not completed or was declined.', null))
        return
      }

      // Find payment record
      const payment = await this.prisma.payment.findFirst({
        where: { reference: ref },
        include: {
          order: {
            include: {
              tenant: { select: { id: true, name: true } },
            },
          },
        },
      })

      if (!payment) {
        // Payment verified by Paystack but no DB record — show success anyway
        res.send(this.callbackHtml('success', 'Payment confirmed!', ref.slice(0, 8).toUpperCase()))
        return
      }

      // Mark payment as paid if not already
      if (payment.status !== 'paid') {
        await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'paid' } })
      }

      // Trigger fulfillment only if order not yet confirmed
      // (Paystack webhook may have already done this — this is the browser-redirect fallback)
      if (payment.order_id && payment.order?.status !== 'confirmed') {
        await this.prisma.order.update({ where: { id: payment.order_id }, data: { status: 'confirmed' } })
        this.fulfillmentService.processOrderFulfillment(payment.order_id, payment.tenant_id, ref).catch((err: Error) => {
          this.logger.error(`Callback fulfillment error: ${err.message}`)
        })
      }

      // Notify tenant users of payment received (fire-and-forget)
      this.notificationService.send({
        tenantId: payment.tenant_id,
        title: '💳 Payment Received',
        body: `Payment confirmed for order #${(payment.order_id ?? ref).slice(-6).toUpperCase()}.`,
        type: 'payment',
        data: { paymentId: payment.id, orderId: payment.order_id ?? '', reference: ref },
      }).catch(() => undefined)

      const tenantName = payment.order?.tenant?.name ?? 'Our Store'
      const orderRef = payment.order_id
        ? payment.order_id.slice(0, 8).toUpperCase()
        : ref.slice(0, 8).toUpperCase()

      res.send(this.callbackHtml('success', tenantName, orderRef))
    } catch (err) {
      this.logger.error(`Payment callback error: ${(err as Error).message}`)
      // Show success page anyway — Paystack only redirects on completed payment
      res.send(this.callbackHtml('success', 'Our Store', ref.slice(0, 8).toUpperCase()))
    }
  }

  private callbackHtml(status: 'success' | 'failed' | 'error', businessName: string | null, orderRef: string | null): string {
    const isSuccess = status === 'success'
    const accentColor = isSuccess ? '#16a34a' : '#dc2626'
    const bgColor = isSuccess ? '#f0fdf4' : '#fef2f2'
    const iconPath = isSuccess
      ? '<path d="M20 6L9 17l-5-5"/>'
      : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
    const headline = isSuccess ? 'Payment Successful!' : 'Payment Not Completed'
    const body = isSuccess
      ? `Your order <strong>#${orderRef ?? ''}</strong> has been confirmed. You will receive a PDF receipt in your WhatsApp chat shortly.`
      : 'Your payment was not completed. Please return to WhatsApp and try again, or contact support.'

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${headline}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:${bgColor};min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:#fff;border-radius:20px;padding:44px 36px;max-width:460px;width:100%;box-shadow:0 4px 32px rgba(0,0,0,.10);text-align:center}
    .icon-wrap{width:76px;height:76px;background:${bgColor};border:3px solid ${accentColor}22;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
    .icon-wrap svg{width:36px;height:36px}
    h1{color:${accentColor};font-size:24px;font-weight:700;margin-bottom:10px}
    .business{color:#6b7280;font-size:14px;margin-bottom:20px;font-weight:500}
    p{color:#374151;font-size:15px;line-height:1.65;margin-bottom:24px}
    .ref-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin-bottom:28px;font-size:13px;color:#374151}
    .ref-box span{font-weight:700;color:#1e293b;font-size:14px}
    .wa-btn{display:inline-flex;align-items:center;gap:10px;background:#25d366;color:#fff;padding:15px 30px;border-radius:50px;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 4px 14px rgba(37,211,102,.35)}
    .wa-btn svg{width:22px;height:22px;flex-shrink:0}
    .note{margin-top:22px;font-size:12px;color:#9ca3af;line-height:1.5}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>
    </div>
    <h1>${headline}</h1>
    ${businessName ? `<p class="business">${businessName}</p>` : ''}
    <p>${body}</p>
    ${isSuccess && orderRef ? `<div class="ref-box">Order Reference: <span>#${orderRef}</span></div>` : ''}
    <a class="wa-btn" href="https://wa.me/">
      <svg viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Return to WhatsApp
    </a>
    <p class="note">A PDF receipt will be sent to your WhatsApp chat. If you need help, please message us on WhatsApp.</p>
  </div>
</body>
</html>`
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updatePaymentStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    if (!user?.tenant_id || user.scope === 'SYSTEM') {
      throw new ForbiddenException('Tenant credentials required')
    }

    const allowed = ['paid', 'declined']
    const newStatus = (body.status || '').toLowerCase()
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(`status must be one of: ${allowed.join(', ')}`)
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id, tenant_id: user.tenant_id },
    })
    if (!payment) {
      throw new ForbiddenException('Payment not found or access denied')
    }
    if (payment.status !== 'pending') {
      throw new BadRequestException('Only pending payments can be overridden')
    }

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: newStatus },
    })

    // If marked paid and has an order, confirm the order + trigger fulfillment
    if (newStatus === 'paid' && updated.order_id) {
      const order = await this.prisma.order.findUnique({ where: { id: updated.order_id } })
      if (order && order.status !== 'confirmed') {
        await this.prisma.order.update({ where: { id: updated.order_id }, data: { status: 'confirmed' } })
        this.fulfillmentService.processOrderFulfillment(updated.order_id, updated.tenant_id, updated.reference).catch((err: Error) => {
          this.logger.error(`Manual payment fulfillment error: ${err.message}`)
        })
      }
    }

    return { id: updated.id, status: updated.status }
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

    const { webhookHandler } = await this.resolvePaymentServices()
    const isValid = webhookHandler.verifyPaystackSignature(rawBody.toString(), signature || '')
    if (!isValid) {
      throw new UnauthorizedException('Invalid Paystack signature')
    }

    await webhookHandler.handlePaystackWebhook(
      JSON.parse(rawBody.toString()),
      async (orderId, tenantId, paymentRef) => {
        await this.fulfillmentService.processOrderFulfillment(orderId, tenantId, paymentRef)
      },
    )
    return { status: 'processed' }
  }
}
