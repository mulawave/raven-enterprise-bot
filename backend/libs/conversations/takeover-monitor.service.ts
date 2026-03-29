import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, Optional } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { NotificationService } from '../notifications/notification.service'

/**
 * TakeoverMonitorService — background service that sends progressive "bot ready to resume"
 * prompts to tenants managing conversations manually.
 *
 * When a tenant takes over a conversation (bot override enabled), this service monitors
 * for inactivity and sends reminder notifications at progressive intervals:
 *   10 min → 20 min → 30 min → 40 min → ...
 *
 * The interval grows by 10 minutes each time the tenant declines the prompt.
 * Activity (new customer message or tenant reply) resets the timer.
 * The bot NEVER auto-resumes — the tenant must explicitly accept or re-enable the bot.
 */
@Injectable()
export class TakeoverMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TakeoverMonitorService.name)
  private intervalRef: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly prisma: PrismaClient,
    private readonly notificationService: NotificationService,
    @Optional() @Inject(Redis) private readonly redis?: Redis,
  ) {}

  onModuleInit() {
    if (!this.redis) {
      this.logger.warn('Redis not available — takeover monitor disabled')
      return
    }

    // Check every 60 seconds for conversations needing a takeover prompt
    this.intervalRef = setInterval(() => {
      this.tick().catch((err) => {
        this.logger.error(`Takeover monitor tick failed: ${(err as Error).message}`)
      })
    }, 60_000)

    this.logger.log('Takeover monitor started (60s interval)')
  }

  onModuleDestroy() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef)
      this.intervalRef = null
    }
  }

  private async tick(): Promise<void> {
    if (!this.redis) return

    // Scan for all active takeover state keys
    const keys: string[] = []
    let cursor = '0'
    do {
      const [nextCursor, batch] = await this.redis.scan(cursor, 'MATCH', 'conv_takeover_state:*', 'COUNT', 100)
      cursor = nextCursor
      keys.push(...batch)
    } while (cursor !== '0')

    if (!keys.length) return

    const now = Date.now()

    for (const stateKey of keys) {
      try {
        const stateRaw = await this.redis.get(stateKey)
        if (!stateRaw) continue

        const state = JSON.parse(stateRaw) as {
          attempt: number
          nextPromptAt: number
          baseInterval: number
          tenantId: string
        }

        // Not yet time for the next prompt
        if (now < state.nextPromptAt) continue

        // Verify override is still active
        const conversationId = stateKey.replace('conv_takeover_state:', '')
        const overrideKey = `conv_override:${conversationId}`
        const isOverridden = await this.redis.exists(overrideKey)

        if (!isOverridden) {
          // Override was cleared (bot re-enabled) — clean up state
          await this.redis.del(stateKey)
          continue
        }

        // Check for recent activity — if there was a message in the last interval window, skip
        const currentInterval = state.baseInterval * (state.attempt + 1)
        const activityCutoff = new Date(now - currentInterval)
        const recentMessage = await this.prisma.message.findFirst({
          where: {
            conversation_id: conversationId,
            created_at: { gt: activityCutoff },
          },
          select: { id: true },
        })

        if (recentMessage) {
          // Activity detected — push the next prompt forward
          state.nextPromptAt = now + currentInterval
          await this.redis.set(stateKey, JSON.stringify(state))
          continue
        }

        // Look up conversation details for the notification
        const conversation = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
          select: {
            tenant_id: true,
            customer: { select: { name: true, phone: true } },
          },
        })
        if (!conversation) {
          await this.redis.del(stateKey)
          continue
        }

        const tenantId = conversation.tenant_id
        const phone = conversation.customer?.phone
        let label = conversation.customer?.name
        if (!label && phone) {
          const savedContact = await this.prisma.contact.findFirst({
            where: { tenant_id: tenantId, phone },
            select: { name: true },
          })
          label = savedContact?.name ?? null
        }
        if (!label) {
          label = phone ? `Customer ${phone.slice(-4)}` : 'A customer'
        }

        const minutesWaited = Math.round(currentInterval / 60_000)

        // Send takeover prompt notification
        await this.notificationService.send({
          tenantId,
          title: '🤖 Bot Ready to Resume',
          body: `No activity in ${label}'s chat for ${minutesWaited} minutes. Would you like the bot to take over?`,
          type: 'takeover_prompt' as any,
          data: {
            conversationId,
            attempt: String(state.attempt),
            customerPhone: phone ?? '',
          },
        })

        // Advance to next interval
        state.attempt += 1
        state.nextPromptAt = now + state.baseInterval * (state.attempt + 1)
        await this.redis.set(stateKey, JSON.stringify(state))

        this.logger.log(
          `Takeover prompt sent for conv ${conversationId} (attempt ${state.attempt}, next in ${Math.round(state.baseInterval * (state.attempt + 1) / 60_000)}min)`,
        )
      } catch (err) {
        this.logger.error(`Error processing takeover state ${stateKey}: ${(err as Error).message}`)
      }
    }
  }
}
