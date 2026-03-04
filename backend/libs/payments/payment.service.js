"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
class PaymentService {
    constructor(prisma, paystack, auditLogger) {
        this.prisma = prisma;
        this.paystack = paystack;
        this.auditLogger = auditLogger;
    }
    async initializePayment(tenantId, amountKobo, email, provider, orderId, bookingId) {
        if (!orderId && !bookingId) {
            throw new Error('PAYMENT_REQUIRES_ORDER_OR_BOOKING');
        }
        const reference = `${tenantId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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
        });
        await this.auditLogger.log({
            tenant_id: tenantId,
            entity_id: payment.id,
            action: 'PAYMENT_INITIALIZED',
            timestamp: new Date(),
        });
        if (provider === 'paystack') {
            const result = await this.paystack.initialize(amountKobo, email, reference, `${process.env.PAYMENT_CALLBACK_URL || 'http://localhost:3000'}/payment/callback`);
            return {
                payment,
                authorizationUrl: result.data.authorization_url,
                accessCode: result.data.access_code,
            };
        }
        throw new Error('PAYMENT_PROVIDER_NOT_SUPPORTED');
    }
    async verifyPayment(tenantId, reference, provider) {
        const payment = await this.prisma.payment.findFirst({
            where: { tenant_id: tenantId, reference },
        });
        if (!payment) {
            throw new Error('PAYMENT_NOT_FOUND');
        }
        if (provider === 'paystack') {
            const result = await this.paystack.verify(reference);
            if (result.data.status === 'success') {
                return this.updatePaymentStatus(tenantId, payment.id, 'paid');
            }
            else {
                return this.updatePaymentStatus(tenantId, payment.id, 'failed');
            }
        }
        throw new Error('PAYMENT_PROVIDER_NOT_SUPPORTED');
    }
    async updatePaymentStatus(tenantId, paymentId, status) {
        const payment = await this.prisma.payment.update({
            where: { id: paymentId, tenant_id: tenantId },
            data: { status },
        });
        await this.auditLogger.log({
            tenant_id: tenantId,
            entity_id: paymentId,
            action: `PAYMENT_STATUS_${status.toUpperCase()}`,
            timestamp: new Date(),
        });
        if (status === 'paid' && payment.order_id) {
            await this.prisma.order.update({
                where: { id: payment.order_id },
                data: { status: 'confirmed' },
            });
        }
        if (status === 'paid' && payment.booking_id) {
            await this.prisma.booking.update({
                where: { id: payment.booking_id },
                data: { status: 'confirmed' },
            });
        }
        return payment;
    }
    async isOrderOrBookingPaid(tenantId, orderId, bookingId) {
        if (orderId) {
            const payment = await this.prisma.payment.findFirst({
                where: { tenant_id: tenantId, order_id: orderId, status: 'paid' },
            });
            return !!payment;
        }
        if (bookingId) {
            const payment = await this.prisma.payment.findFirst({
                where: { tenant_id: tenantId, booking_id: bookingId, status: 'paid' },
            });
            return !!payment;
        }
        return false;
    }
}
exports.PaymentService = PaymentService;
