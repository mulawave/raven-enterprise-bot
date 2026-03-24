import { PrismaClient } from '@prisma/client'
import { Logger } from '@nestjs/common'
import { MessageSender } from '../../apps/api/messaging/message.sender'
import { EmailService } from '../email/email.service'
import { ConfigLoaderService } from '../config/config-loader.service'
import { generateReceiptPdf, generateReceiptHtml, generateOrderNotificationHtml } from './receipt.generator'

/** The RBA tenant receives all notifications at this address. */
const RBA_NOTIFICATION_EMAIL = 'richardobroh@gmail.com'

export class OrderFulfillmentService {
  private readonly logger = new Logger(OrderFulfillmentService.name)

  constructor(
    private readonly prisma: PrismaClient,
    private readonly emailService: EmailService,
    private readonly configLoader: ConfigLoaderService,
  ) {}

  async processOrderFulfillment(orderId: string, tenantId: string, paymentRef: string): Promise<void> {
    this.logger.log(`Processing fulfillment for order ${orderId}`)

    // Load order with all relations needed
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: { menuItem: { select: { name: true, price_kobo: true } } },
        },
        customer: { select: { id: true, name: true, email: true, phone: true } },
        tenant: { select: { id: true, name: true, theme: true, logo_url: true } },
      },
    })

    if (!order) {
      this.logger.error(`Order ${orderId} not found during fulfillment`)
      return
    }

    // Find the most recent conversation for this customer
    const conversation = await this.prisma.conversation.findFirst({
      where: { tenant_id: tenantId, customer_id: order.customer_id },
      orderBy: { updated_at: 'desc' },
    })

    // Parse per-tenant WhatsApp credentials
    const theme = order.tenant.theme ? (JSON.parse(order.tenant.theme) as Record<string, unknown>) : {}
    const accessToken = (theme.META_ACCESS_TOKEN as string) ?? (await this.configLoader.get('META_ACCESS_TOKEN')) ?? ''
    const phoneNumberId = (theme.META_PHONE_NUMBER_ID as string) ?? (await this.configLoader.get('META_PHONE_NUMBER_ID')) ?? ''
    const customerPhone = order.customer.phone

    // Extract branding — logo_url is stored as a relative path (/uploads/logos/...)
    // so we must construct the full URL before passing it to the receipt generator
    const rawLogoUrl = order.tenant.logo_url ?? undefined
    const tenantLogoUrl = rawLogoUrl
      ? (rawLogoUrl.startsWith('http') ? rawLogoUrl : `https://api.raven-ai.online${rawLogoUrl.startsWith('/') ? '' : '/'}${rawLogoUrl}`)
      : undefined
    let tenantAddress: string | undefined
    try {
      const addr = (theme.address as string) ?? (theme.businessAddress as string) ?? undefined
      if (addr) tenantAddress = addr
    } catch { /* ignore */ }

    const receiptData = {
      orderId: order.id,
      tenantName: order.tenant.name,
      tenantLogoUrl,
      tenantAddress,
      customerName: order.customer.name ?? 'Customer',
      customerEmail: order.customer.email ?? '',
      items: order.orderItems.map((oi) => ({
        name: oi.menuItem.name,
        quantity: oi.quantity,
        priceKobo: oi.price_kobo,
      })),
      totalKobo: order.total_kobo,
      paymentRef,
      paidAt: new Date(),
    }

    // ── WhatsApp delivery (direct send — bypasses Redis BullMQ entirely) ─────
    if (customerPhone && conversation && accessToken && phoneNumberId) {
      const sender = new MessageSender(accessToken, phoneNumberId)
      const receiptFilename = `Receipt-${order.id.slice(0, 8).toUpperCase()}.pdf`

      let pdfMediaId: string | null = null
      try {
        const pdfBuffer = await generateReceiptPdf(receiptData)
        pdfMediaId = await sender.uploadMediaBuffer(pdfBuffer, 'application/pdf', receiptFilename)
        this.logger.log(`PDF receipt uploaded, media_id: ${pdfMediaId}`)
      } catch (err) {
        this.logger.warn(`PDF generation/upload failed (non-fatal): ${(err as Error).message}`)
      }

      if (pdfMediaId) {
        try {
          await sender.sendDocument(customerPhone, pdfMediaId, receiptFilename)
          await this.persistBotMessage(conversation.id, tenantId, `[PDF receipt sent: ${receiptFilename}]`)
          this.logger.log(`PDF receipt sent to ${customerPhone}`)
        } catch (err) {
          this.logger.warn(`PDF send failed (non-fatal): ${(err as Error).message}`)
        }
      }

      // Short pause so the PDF lands before the confirmation text
      await new Promise((r) => setTimeout(r, 1200))

      const confirmMsg = `Payment confirmed! ✅\n\nYour order #${order.id.slice(0, 8).toUpperCase()} has been received. Your PDF receipt has been sent above.\n\nA team member will be in touch shortly. Thank you for your purchase! 🙏`
      try {
        await sender.sendMessage(customerPhone, confirmMsg)
        await this.persistBotMessage(conversation.id, tenantId, confirmMsg)
        this.logger.log(`Confirmation message sent to ${customerPhone}`)
      } catch (err) {
        this.logger.warn(`Confirmation message failed (non-fatal): ${(err as Error).message}`)
      }
    }

    // ── Email receipt to customer ─────────────────────────────────────────
    if (order.customer.email) {
      try {
        await this.emailService.send({
          to: order.customer.email,
          subject: `Your Receipt — ${order.tenant.name} — Order #${order.id.slice(0, 8).toUpperCase()}`,
          html: generateReceiptHtml(receiptData),
        })
        this.logger.log(`Receipt email sent to ${order.customer.email}`)
      } catch (err) {
        this.logger.warn(`Receipt email failed (non-fatal): ${(err as Error).message}`)
      }
    }

    // ── Notification email to tenant / RBA ────────────────────────────────
    try {
      const notificationEmail = await this.getNotificationEmail(tenantId)
      if (notificationEmail) {
        const total = `₦${(order.total_kobo / 100).toLocaleString('en-NG')}`
        await this.emailService.send({
          to: notificationEmail,
          subject: `🎉 New Order — ${total} — ${order.tenant.name}`,
          html: generateOrderNotificationHtml(receiptData),
        })
        this.logger.log(`Notification email sent to ${notificationEmail}`)
      }
    } catch (err) {
      this.logger.warn(`Notification email failed (non-fatal): ${(err as Error).message}`)
    }
  }

  /** Persists an outbound bot message to the DB so the conversation history is correct. */
  private async persistBotMessage(conversationId: string, tenantId: string, content: string): Promise<void> {
    await this.prisma.message.create({
      data: { tenant_id: tenantId, conversation_id: conversationId, sender_type: 'bot', content, created_at: new Date() },
    })
    await this.prisma.conversation.update({ where: { id: conversationId }, data: { updated_at: new Date() } })
  }

  /** Returns RBA email for the first tenant, owner email for others. */
  private async getNotificationEmail(tenantId: string): Promise<string | null> {
    const firstTenant = await this.prisma.tenant.findFirst({ orderBy: { created_at: 'asc' }, select: { id: true } })
    if (firstTenant?.id === tenantId) {
      return RBA_NOTIFICATION_EMAIL
    }
    const owner = await this.prisma.user.findFirst({
      where: { tenant_id: tenantId, role: 'owner' },
      select: { email: true },
    })
    return owner?.email ?? null
  }
}
