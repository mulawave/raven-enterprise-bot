/**
 * MessagingModule — inbound webhooks, AI message processing and broadcast delivery.
 */
import { Module } from '@nestjs/common'
import { BillingModule } from './billing.module'

// Controllers
import { WebhookController } from '../messaging/webhook.controller'
import { AdminBroadcastController } from '../admin/broadcast.controller'

// Processors / workers
import { AiMessageProcessor } from '../../worker/messaging/ai-message.processor'

// Broadcast rate-limiting (value instances — not injectable classes)
import { BroadcastLimiter } from '../admin/broadcast/broadcast.limiter'
import { ChannelCooldownTracker } from '../admin/broadcast/cooldown.tracker'

@Module({
  imports: [BillingModule],
  controllers: [WebhookController, AdminBroadcastController],
  providers: [
    AiMessageProcessor,
    {
      provide: BroadcastLimiter,
      useValue: new BroadcastLimiter({ perTenant: { limit: 100, windowMs: 3_600_000 }, perChannel: {} }),
    },
    {
      provide: ChannelCooldownTracker,
      useValue: new ChannelCooldownTracker({ defaultCooldownMs: 60_000 }),
    },
  ],
})
export class MessagingModule {}
