import { PrismaClient } from '@prisma/client';
interface PaystackWebhookEvent {
    event: string;
    data: {
        reference: string;
        status: 'success' | 'failed';
        amount: number;
        [key: string]: any;
    };
}
export declare class WebhookHandler {
    private readonly prisma;
    private readonly paystackSecret;
    private readonly processed;
    constructor(prisma: PrismaClient, paystackSecret: string);
    verifyPaystackSignature(payload: string, signature: string): boolean;
    handlePaystackWebhook(event: PaystackWebhookEvent): Promise<void>;
}
export {};
