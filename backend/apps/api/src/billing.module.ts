/**
 * BillingModule — subscriptions, invoicing, payment gateways and lifecycle scheduling.
 */
import { Module } from '@nestjs/common'

// Controllers
import { PaymentController } from './payment.controller'
import { SubscriptionsController } from '../admin/subscriptions.controller'
import { AdminBillingController } from '../admin/billing/admin-billing.controller'
import { AdminSubscriptionsController } from '../admin/subscriptions/admin-subscriptions.controller'

// Services
import { SubscriptionsService } from '../../../libs/billing/subscriptions.service'
import { SuspensionService } from '../../../libs/billing/enforcement/suspension.service'
import { InvoiceGenerator } from '../../../libs/billing/charging/invoice.generator'
import { ChargeExecutor } from '../../../libs/billing/charging/charge.executor'
import { ChargeScheduler } from '../../../libs/billing/charging/charge.scheduler'
import { ChargeWebhookHandler } from '../../../libs/billing/charging/charge.webhook'
import { GracePeriodChecker } from '../../../libs/billing/enforcement/grace.checker'
import { UsageTracker as BillingUsageTracker } from '../../../libs/billing/usage.tracker'
import { BillingLifecycleService } from '../../../libs/billing/billing-lifecycle.service'
import { PaystackService } from '../../../libs/payments/paystack.service'
import { FlutterwaveService } from '../../../libs/payments/flutterwave.service'
import { ComplianceModule } from './compliance.module'
import { AuthModule } from './auth.module'
import { AppConfigModule } from './app-config.module'

@Module({
  imports: [ComplianceModule, AuthModule, AppConfigModule],
  controllers: [
    PaymentController,
    SubscriptionsController,
    AdminBillingController,
    AdminSubscriptionsController,
  ],
  providers: [
    SubscriptionsService,
    SuspensionService,
    InvoiceGenerator,
    ChargeExecutor,
    ChargeScheduler,
    ChargeWebhookHandler,
    GracePeriodChecker,
    BillingUsageTracker,
    BillingLifecycleService,
    { provide: PaystackService, useFactory: () => new PaystackService(process.env.PAYSTACK_SECRET_KEY ?? '') },
    { provide: FlutterwaveService, useFactory: () => new FlutterwaveService(process.env.FLUTTERWAVE_SECRET_KEY ?? '') },
  ],
  exports: [
    SubscriptionsService,
    SuspensionService,
    BillingUsageTracker,
    ChargeWebhookHandler,
    PaystackService,
    FlutterwaveService,
    BillingLifecycleService,
  ],
})
export class BillingModule {}
