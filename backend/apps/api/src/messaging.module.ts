/**
 * MessagingModule — inbound webhooks, AI message processing and broadcast delivery.
 */
import { Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { BillingModule } from './billing.module'
import { AuthModule } from './auth.module'

// Controllers
import { WebhookController } from '../messaging/webhook.controller'
import { AdminBroadcastController } from '../admin/broadcast.controller'
import { ConversationsController } from '../messaging/conversations.controller'

// Processors / workers
import { AiMessageProcessor } from '../../worker/messaging/ai-message.processor'
import { OutboundMessageWorker } from '../../worker/messaging/outbound-message.worker'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'
import { TakeoverMonitorService } from '../../../libs/conversations/takeover-monitor.service'
import { OpenAIResponseGenerator } from '../../../libs/ai-engine/openai-response.generator'

// Broadcast rate-limiting (value instances — not injectable classes)
import { BroadcastLimiter } from '../admin/broadcast/broadcast.limiter'
import { ChannelCooldownTracker } from '../admin/broadcast/cooldown.tracker'

@Module({
  imports: [BillingModule, AuthModule],
  controllers: [WebhookController, AdminBroadcastController, ConversationsController],
  providers: [
    AiMessageProcessor,
    TakeoverMonitorService,
    {
      provide: OpenAIResponseGenerator,
      useFactory: (configLoader: ConfigLoaderService) => new OpenAIResponseGenerator(configLoader),
      inject: [ConfigLoaderService],
    },
    {
      provide: 'AI_MESSAGE_PROCESSOR',
      useExisting: AiMessageProcessor,
    },
    {
      provide: BroadcastLimiter,
      useValue: new BroadcastLimiter({ perTenant: { limit: 100, windowMs: 3_600_000 }, perChannel: {} }),
    },
    {
      provide: ChannelCooldownTracker,
      useValue: new ChannelCooldownTracker({ defaultCooldownMs: 60_000 }),
    },
    {
      provide: OutboundMessageWorker,
      useFactory: (prisma: PrismaClient, redisConnection: Redis, configLoader: ConfigLoaderService) =>
        new OutboundMessageWorker(prisma, redisConnection, configLoader),
      inject: [PrismaClient, Redis, ConfigLoaderService],
    },
  ],
})
export class MessagingModule {}

