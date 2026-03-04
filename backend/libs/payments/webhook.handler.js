"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookHandler = void 0;
const crypto_1 = __importDefault(require("crypto"));
class WebhookHandler {
    constructor(prisma, paystackSecret) {
        this.prisma = prisma;
        this.paystackSecret = paystackSecret;
        this.processed = new Set();
    }
    verifyPaystackSignature(payload, signature) {
        const hash = crypto_1.default.createHmac('sha512', this.paystackSecret).update(payload).digest('hex');
        return hash === signature;
    }
    async handlePaystackWebhook(event) {
        if (event.event !== 'charge.success') {
            return;
        }
        const ref = event.data.reference;
        if (!ref || this.processed.has(ref)) {
            console.warn(`[WEBHOOK] Duplicate or invalid reference: ${ref}`);
            return;
        }
        this.processed.add(ref);
        const status = event.data.status === 'success' ? 'paid' : 'failed';
        const payment = await this.prisma.payment.findFirst({
            where: { reference: ref },
        });
        if (!payment) {
            console.error(`[WEBHOOK] Payment not found for reference: ${ref}`);
            return;
        }
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status },
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
        await this.prisma.paymentAudit.create({
            data: {
                tenant_id: payment.tenant_id,
                payment_id: payment.id,
                status,
                reference: ref,
            },
        });
    }
}
exports.WebhookHandler = WebhookHandler;
