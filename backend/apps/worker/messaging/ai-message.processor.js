"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiMessageProcessor = void 0;
const bullmq_1 = require("bullmq");
const ai_service_1 = require("../../../libs/ai-engine/ai.service");
const intent_router_1 = require("../../../libs/ai-engine/intent.router");
const state_machine_1 = require("../../../libs/ai-engine/state.machine");
const session_store_1 = require("../../../libs/ai-engine/session.store");
const ai_service_2 = require("../../../libs/ai-engine/ai.service");
const audit_logger_1 = require("../../../libs/monitoring/audit.logger");
const subscriptions_service_1 = require("../../../libs/billing/subscriptions.service");
const branding_service_1 = require("../../../libs/tenant/branding/branding.service");
// Adapter to make ioredis compatible with RedisClient interface
class RedisAdapter {
    constructor(redis) {
        this.redis = redis;
    }
    async get(key) {
        return this.redis.get(key);
    }
    async set(key, value, mode, durationSeconds) {
        if (mode === 'EX' && durationSeconds) {
            return this.redis.set(key, value, 'EX', durationSeconds);
        }
        return this.redis.set(key, value);
    }
}
class AiMessageProcessor {
    constructor(prisma, redisConnection) {
        this.prisma = prisma;
        this.redisConnection = redisConnection;
        // Initialize queue
        this.queue = new bullmq_1.Queue('ai-messages', {
            connection: this.redisConnection,
        });
        // Initialize AI service with dependencies
        const redisAdapter = new RedisAdapter(this.redisConnection);
        const sessionStore = new session_store_1.RedisSessionStore(redisAdapter);
        const router = new intent_router_1.IntentRouter();
        const stateMachine = new state_machine_1.StateMachine();
        const fallback = new ai_service_2.FallbackHandler();
        const auditLogger = new audit_logger_1.AuditLogger(this.prisma);
        this.aiService = new ai_service_1.AiService(router, stateMachine, sessionStore, fallback, auditLogger);
        this.subscriptionsService = new subscriptions_service_1.SubscriptionsService(this.prisma);
        this.brandingService = new branding_service_1.BrandingService(this.prisma);
        // Initialize worker with retry logic
        this.worker = new bullmq_1.Worker('ai-messages', async (job) => this.processJob(job), {
            connection: this.redisConnection,
            concurrency: 5,
            limiter: {
                max: 100,
                duration: 60000, // 100 jobs per minute
            },
        });
        // Event handlers
        this.worker.on('completed', (job) => {
            console.log(`[AI Worker] Job ${job.id} completed for conversation ${job.data.conversationId}`);
        });
        this.worker.on('failed', (job, err) => {
            console.error(`[AI Worker] Job ${job?.id} failed:`, err.message);
        });
    }
    async enqueue(data) {
        await this.queue.add('process-message', data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: 100, // Keep last 100 completed jobs
            removeOnFail: 500, // Keep last 500 failed jobs
        });
    }
    async processJob(job) {
        const { conversationId, messageId, tenantId, customerId, content } = job.data;
        console.log(`[AI Worker] Processing message ${messageId} in conversation ${conversationId}`);
        // Fetch tenant branding for personalized AI responses
        const branding = await this.brandingService.getBranding(tenantId);
        // Call AI service
        const input = {
            sessionId: conversationId,
            text: content,
            tenantId,
            userId: customerId,
            brandingName: branding.name, // Inject business name for AI
        };
        const output = await this.aiService.processMessage(input);
        // Increment conversation counter for billing
        try {
            await this.subscriptionsService.incrementConversationCount(tenantId);
            console.log(`[AI Worker] Incremented conversation count for tenant ${tenantId}`);
        }
        catch (error) {
            console.error(`[AI Worker] Failed to increment conversation count:`, error);
            // Don't fail the job if billing tracking fails
        }
        // 
        // For now, just log the AI response
        // In a real system, this would enqueue an outbound message job
        console.log(`[AI Worker] AI Response: "${output.text}" (intent: ${output.intent}, state: ${output.state})`);
        // TODO PHASE 5: Enqueue outbound message
        // await this.outboundQueue.enqueue({
        //   conversationId,
        //   tenantId,
        //   customerId,
        //   content: output.text,
        // })
        return output;
    }
    async close() {
        await this.worker.close();
        await this.queue.close();
    }
}
exports.AiMessageProcessor = AiMessageProcessor;
