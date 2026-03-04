import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
export interface AiMessageJob {
    conversationId: string;
    messageId: string;
    tenantId: string;
    customerId: string;
    content: string;
}
export declare class AiMessageProcessor {
    private readonly prisma;
    private readonly redisConnection;
    private readonly queue;
    private readonly worker;
    private readonly aiService;
    private readonly subscriptionsService;
    private readonly brandingService;
    constructor(prisma: PrismaClient, redisConnection: Redis);
    enqueue(data: AiMessageJob): Promise<void>;
    private processJob;
    close(): Promise<void>;
}
