import { WebhookController } from './webhook.controller'
import { MessageParser } from './message.parser'
import { MessageSender } from './message.sender'
import { InstagramAdapter } from './instagram.adapter'
import { FacebookAdapter } from './facebook.adapter'

export const MESSAGING_SERVICES = [
  WebhookController,
  MessageParser,
  MessageSender,
  InstagramAdapter,
  FacebookAdapter,
]
