import { PaystackService } from './paystack.service'
import { FlutterwaveService } from './flutterwave.service'
import { PaymentService } from './payment.service'
import { WebhookHandler } from './webhook.handler'

export const PAYMENTS_SERVICES = [
  PaystackService,
  FlutterwaveService,
  PaymentService,
  WebhookHandler,
]
