import { Controller, Post, Get, Req, Res, Query, Body, HttpStatus, Headers, UnauthorizedException, Inject, Optional, Logger } from '@nestjs/common'
import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { MessageParser, ParsedMessage } from './message.parser'
import { SessionResolver } from './session.resolver'
import { InstagramAdapter } from './instagram.adapter'
import { FacebookAdapter } from './facebook.adapter'
import * as crypto from 'crypto'
import { ConfigLoaderService } from '../../../libs/config/config-loader.service'

// Import worker processor (optional - only if workers are initialized)
import type { AiMessageProcessor } from '../../worker/messaging/ai-message.processor'

interface WebhookQueryDto {
  'hub.mode'?: string
  'hub.challenge'?: string
  'hub.verify_token'?: string
}

@Controller('api/messaging/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)
  private readonly parser: MessageParser
  private readonly sessionResolver: SessionResolver
  private readonly instagramAdapter: InstagramAdapter
  private readonly facebookAdapter: FacebookAdapter

  constructor(
    private readonly prisma: PrismaClient,
    @Optional() @Inject('AI_MESSAGE_PROCESSOR') private readonly aiProcessor?: AiMessageProcessor,
    @Optional() private readonly configLoader?: ConfigLoaderService,
    @Optional() @Inject(Redis) private readonly redis?: Redis,
  ) {
    this.parser = new MessageParser()
    this.sessionResolver = new SessionResolver(prisma)
    this.instagramAdapter = new InstagramAdapter(this.parser)
    this.facebookAdapter = new FacebookAdapter(this.parser)
  }

  @Get('verify')
  async verify(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') verifyToken: string,
    @Res() res: Response,
  ) {
    if (mode !== 'subscribe') {
      return res.sendStatus(403)
    }

    // Check global verify token first
    const globalToken = (this.configLoader
      ? await this.configLoader.get('META_WEBHOOK_VERIFY_TOKEN')
      : process.env.META_WEBHOOK_VERIFY_TOKEN) || ''

    if (!globalToken) {
      this.logger.error('META_WEBHOOK_VERIFY_TOKEN is not configured — rejecting webhook verification. Set it via Settings or environment.')
      return res.sendStatus(403)
    }

    if (verifyToken === globalToken) {
      return res.status(200).send(challenge)
    }

    // Check per-tenant verify tokens stored in Tenant.theme
    const tenants = await this.prisma.tenant.findMany({ select: { theme: true } })
    for (const t of tenants) {
      if (!t.theme) continue
      try {
        const theme = JSON.parse(t.theme) as Record<string, unknown>
        if (typeof theme.META_WEBHOOK_VERIFY_TOKEN === 'string' && theme.META_WEBHOOK_VERIFY_TOKEN === verifyToken) {
          return res.status(200).send(challenge)
        }
      } catch { /* ignore */ }
    }

    return res.sendStatus(403)
  }

  /**
   * POST /api/messaging/webhook/verify
   * Alias for /whatsapp — handles cases where Meta's Callback URL was configured
   * pointing at the verify endpoint instead of /whatsapp.
   */
  @Post('verify')
  async receiveWhatsAppViaVerify(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Res() res: Response,
  ) {
    this.logger.warn('Received WhatsApp POST on /verify endpoint — processing. Update your Meta Callback URL to /api/messaging/webhook/whatsapp.')
    // Facebook sends a test POST to the callback URL to confirm it is reachable —
    // these have no real message payload and no valid HMAC. Accept them silently.
    if (!body?.entry?.length) {
      return res.sendStatus(200)
    }
    // Best-effort signature check: log failure and reject if HMAC is invalid.
    // This is a fallback alias endpoint for misconfigured callback URLs.
    try {
      await this.validateSignature(JSON.stringify(body), signature)
    } catch (err) {
      this.logger.error(`HMAC validation failed on /verify endpoint — rejecting payload: ${(err as Error).message}`)
      return res.sendStatus(401)
    }
    await this.processMessages(body, 'whatsapp', this.parser)
    res.sendStatus(200)
  }

  @Post('whatsapp')
  async receiveWhatsApp(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Res() res: Response,
  ) {
    if (!body?.entry?.length) {
      return res.sendStatus(200)
    }
    await this.validateSignature(JSON.stringify(body), signature)
    await this.processMessages(body, 'whatsapp', this.parser)
    res.sendStatus(200)
  }

  @Post('instagram')
  async receiveInstagram(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Res() res: Response,
  ) {
    await this.validateSignature(JSON.stringify(body), signature)
    await this.processMessages(body, 'instagram', this.instagramAdapter)
    res.sendStatus(200)
  }

  @Post('facebook')
  async receiveFacebook(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Res() res: Response,
  ) {
    await this.validateSignature(JSON.stringify(body), signature)
    await this.processMessages(body, 'facebook', this.facebookAdapter)
    res.sendStatus(200)
  }

  private async validateSignature(payload: string, signature: string | undefined): Promise<void> {
    // Collect every known app secret (global + all per-tenant)
    const secrets: string[] = []

    const globalSecret = (this.configLoader
      ? await this.configLoader.get('META_APP_SECRET')
      : process.env.META_APP_SECRET) || ''

    if (globalSecret) secrets.push(globalSecret)

    const tenants = await this.prisma.tenant.findMany({ select: { theme: true } })
    for (const t of tenants) {
      if (!t.theme) continue
      try {
        const theme = JSON.parse(t.theme) as Record<string, unknown>
        if (typeof theme.META_APP_SECRET === 'string' && theme.META_APP_SECRET) {
          secrets.push(theme.META_APP_SECRET)
        }
      } catch { /* ignore */ }
    }

    // No secrets configured anywhere — reject in production, warn loudly.
    // Save your App Secret in Settings → WhatsApp & AI to enforce signature validation.
    if (secrets.length === 0) {
      this.logger.error('No META_APP_SECRET configured — rejecting webhook payload. Save your App Secret in Settings → WhatsApp & AI.')
      throw new UnauthorizedException('No META_APP_SECRET configured')
    }

    // At least one secret is known — signature is now mandatory
    if (!signature) {
      throw new UnauthorizedException('Missing X-Hub-Signature-256 header')
    }

    for (const secret of secrets) {
      const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
      if (signature === expected) return
    }

    throw new UnauthorizedException('Invalid webhook signature')
  }

  private async processMessages(
    payload: any,
    platform: 'whatsapp' | 'instagram' | 'facebook',
    adapter: MessageParser | InstagramAdapter | FacebookAdapter,
  ): Promise<void> {
    const messages = adapter.parse(payload)

    for (const msg of messages) {
      const { conversationId, customerId, tenantId } = await this.sessionResolver.resolve(
        msg.conversationId,
        msg.from,
      )

      const message = await this.prisma.message.create({
        data: {
          tenant_id: tenantId,
          conversation_id: conversationId,
          sender_type: 'customer',
          sender_id: customerId,
          content: msg.text,
          created_at: new Date(parseInt(msg.timestamp) * 1000),
        },
      })

      // Bubble conversation to top of inbox (sorted by updated_at desc)
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updated_at: new Date() },
      })

      // Check bot override: if a human agent is managing this conversation,
      // skip AI processing entirely. The bot will NOT auto-resume — a human
      // must explicitly re-enable it or accept a takeover prompt.
      if (this.redis) {
        const overrideKey = `conv_override:${conversationId}`
        const isOverridden = await this.redis.exists(overrideKey)
        if (isOverridden) {
          this.logger.log(`Bot override active for conv ${conversationId} — skipping AI (indefinite until tenant re-enables)`)

          // Reset the takeover prompt timer — new customer activity pushes the next prompt forward
          const stateKey = `conv_takeover_state:${conversationId}`
          const stateRaw = await this.redis.get(stateKey)
          if (stateRaw) {
            try {
              const state = JSON.parse(stateRaw)
              const currentInterval = state.baseInterval * (state.attempt + 1)
              state.nextPromptAt = Date.now() + currentInterval
              await this.redis.set(stateKey, JSON.stringify(state))
            } catch { /* ignore malformed state */ }
          }

          continue
        }
      }

      // Process AI job directly in-process (bypasses Redis BullMQ queue to avoid allkeys-lru eviction)
      if (this.aiProcessor) {
        this.aiProcessor.scheduleProcess({
          conversationId,
          messageId: message.id,
          tenantId,
          customerId,
          content: msg.text,
        })
        this.logger.log(`Scheduled direct AI processing for message ${message.id}`)
      } else {
        this.logger.warn('AI processor not available — message saved but not processed')
      }
    }
  }
}
