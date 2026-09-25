import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'

// ── Infrastructure (global — provides PrismaClient + Redis everywhere) ─────
import { InfrastructureModule, redis } from './infrastructure.module'

// ── Feature modules ────────────────────────────────────────────────────────
import { AuthModule } from './auth.module'
import { BillingModule } from './billing.module'
import { TenantModule } from './tenant.module'
import { MessagingModule } from './messaging.module'
import { AnalyticsModule } from './analytics.module'
import { ComplianceModule } from './compliance.module'
import { AdminModule } from './admin.module'
import { AppConfigModule } from './app-config.module'

// ── Licensing ──────────────────────────────────────────────────────────────
import { LicensingModule } from '../../../libs/licensing/licensing.module'
import { LicensingGuard } from '../../../libs/licensing/licensing.guard'

// ── Core controllers (remain in AppModule — only need PrismaClient) ────────
import { HealthController } from './health.controller'
import { ReadinessController } from './readiness.controller'
import { OrderingController } from './ordering.controller'
import { BookingController } from './booking.controller'
import { PublicConfigController } from './public-config.controller'
import { DataDeletionController } from './data-deletion.controller'
import { FaqController } from './faq.controller'
import { TenantKeysController } from './tenant-keys.controller'
import { ContactController } from './contact.controller'
import { BotConfigController } from './bot-config.controller'
import { WebsiteAssistantController } from './website-assistant.controller'
import { WidgetController } from './widget.controller'
import { PlansController } from './plans.controller'
import { EmailListController } from './email-list.controller'
import { NotificationController } from './notification.controller'
import {
  TenantAnalyticsController,
  TenantCustomersController,
  TenantPaymentsController,
  TenantBroadcastController,
} from './tenant-data.controller'

// ── Notifications (global — push + in-app) ────────────────────────────────
import { NotificationsModule } from '../../../libs/notifications/notifications.module'

// ── Middleware ─────────────────────────────────────────────────────────────
import { LoggingMiddleware } from './logging.middleware'
import { rateLimitMiddleware } from '../rate-limit.middleware'
import { TenantMiddleware } from '../../../libs/auth/middleware/tenant.middleware'
import { BranchResolverMiddleware } from '../../../libs/tenant/branch.middleware'

@Module({
  imports: [
    InfrastructureModule,
    AppConfigModule,
    NotificationsModule,
    AuthModule,
    BillingModule,
    TenantModule,
    MessagingModule,
    AnalyticsModule,
    ComplianceModule,
    AdminModule,
    LicensingModule,
  ],
  controllers: [
    HealthController,
    ReadinessController,
    OrderingController,
    BookingController,
    PublicConfigController,
    DataDeletionController,
    FaqController,
    TenantKeysController,
    ContactController,
    BotConfigController,
    WebsiteAssistantController,
    WidgetController,
    PlansController,
    EmailListController,
    NotificationController,
    TenantAnalyticsController,
    TenantCustomersController,
    TenantPaymentsController,
    TenantBroadcastController,
  ],
  providers: [
    { provide: 'APP_GUARD', useClass: LicensingGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Request logging on all routes
    consumer.apply(LoggingMiddleware).forRoutes('*')

    // Tenant JWT resolution — exclude public routes
    consumer
      .apply(TenantMiddleware)
      .exclude('/health', '/readiness', '/admin/auth/login', '/admin/auth/refresh', '/api/auth/login', '/api/config/public', '/api/config/branding', '/webhooks/(.*)', '/api/data-deletion/status/(.*)', '/api/data-deletion/public', '/api/auth/confirm-by-code', '/api/auth/resend-confirmation', '/api/licensing/(.*)', '/api/plans/public', '/widget/(.*)')
      .forRoutes('*')

    // Branch context — only needed for routes that scope to a branch
    consumer
      .apply(BranchResolverMiddleware)
      .forRoutes(
        'api/ordering',
        'api/bookings',
        'api/payments',
        'admin/orders',
        'admin/bookings',
      )

    // Tenant-facing rate limiting
    consumer
      .apply(rateLimitMiddleware(redis, 'tenant'))
      .forRoutes(
        'api/ordering',
        'api/bookings',
        'api/payments',
        'subscriptions',
        'branding',
        'tenant/context',
      )

    // Channel rate limiting for webhook / messaging endpoints
    consumer
      .apply(rateLimitMiddleware(redis, 'channel'))
      .forRoutes('webhooks')
  }
}
