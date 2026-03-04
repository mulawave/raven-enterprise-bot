import { PrismaClient, Payment } from '@prisma/client';
import { PaystackService } from './paystack.service';
import { AuditLogger } from '../monitoring/audit.logger';
export type PaymentProvider = 'paystack';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export interface InitializePaymentResult {
    payment: Payment;
    authorizationUrl: string;
    accessCode?: string;
}
export declare class PaymentService {
    private readonly prisma;
    private readonly paystack;
    private readonly auditLogger;
    constructor(prisma: PrismaClient, paystack: PaystackService, auditLogger: AuditLogger);
    initializePayment(tenantId: string, amountKobo: number, email: string, provider: PaymentProvider, orderId?: string, bookingId?: string): Promise<InitializePaymentResult>;
    verifyPayment(tenantId: string, reference: string, provider: PaymentProvider): Promise<Payment>;
    updatePaymentStatus(tenantId: string, paymentId: string, status: PaymentStatus): Promise<Payment>;
    isOrderOrBookingPaid(tenantId: string, orderId?: string, bookingId?: string): Promise<boolean>;
}
