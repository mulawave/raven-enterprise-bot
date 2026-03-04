import { Controller, Post, Get, Req, Res, Query, Body, HttpStatus, Headers, UnauthorizedException, Inject, Optional, Logger } from '@nestjs/common'
import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { MessageParser, ParsedMessage } from './message.parser'
import { SessionResolver } from './session.resolver'
import { InstagramAdapter } from './instagram.adapter'
import { FacebookAdapter } from './facebook.adapter'
import * as crypto from 'crypto'

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
  ) {
    this.parser = new MessageParser()
    this.sessionResolver = new SessionResolver(prisma)
    this.instagramAdapter = new InstagramAdapter(this.parser)
    this.facebookAdapter = new FacebookAdapter(this.parser)
  }

  @Get('verify')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') verifyToken: string,
    @Res() res: Response,
  ) {
    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'test-verify-token'
    if (mode === 'subscribe' && verifyToken === expectedToken) {
      return res.status(200).send(challenge)
    }
    return res.sendStatus(403)
  }

  @Post('whatsapp')
  async receiveWhatsApp(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Res() res: Response,
  ) {
    this.validateSignature(JSON.stringify(body), signature)
    await this.processMessages(body, 'whatsapp', this.parser)
    res.sendStatus(200)
  }

  @Post('instagram')
  async receiveInstagram(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Res() res: Response,
  ) {
    this.validateSignature(JSON.stringify(body), signature)
    await this.processMessages(body, 'instagram', this.instagramAdapter)
    res.sendStatus(200)
  }

  @Post('facebook')
  async receiveFacebook(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Res() res: Response,
  ) {
    this.validateSignature(JSON.stringify(body), signature)
    await this.processMessages(body, 'facebook', this.facebookAdapter)
    res.sendStatus(200)
  }

  private validateSignature(payload: string, signature: string | undefined): void {
    const secret = process.env.META_APP_SECRET
    if (!secret) {
      throw new UnauthorizedException('META_APP_SECRET not configured')
    }

    if (!signature) {
      throw new UnauthorizedException('Missing signature')
    }

    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid signature')
    }
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

      // Enqueue AI processing job
      if (this.aiProcessor) {
        await this.aiProcessor.enqueue({
          conversationId,
          messageId: message.id,
          tenantId,
          customerId,
          content: msg.text,
        })
        this.logger.log(`Enqueued AI job for message ${message.id}`)
      } else {
        this.logger.warn('AI processor not available — message saved but not processed')
      }
    }
  }
}
