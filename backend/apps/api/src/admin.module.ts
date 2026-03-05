/**
 * AdminModule — operational admin panel controllers for ops, system, settings,
 * search, support, orders, bookings, customers and reseller management.
 */
import { Module } from '@nestjs/common'
import { AuthModule } from './auth.module'

// Controllers
import { AdminOpsController } from '../admin/ops/admin-ops.controller'
import { AdminSystemController } from '../admin/system/admin-system.controller'
import { AdminSettingsController } from '../admin/settings/admin-settings.controller'
import { AdminBookingsController } from '../admin/bookings.controller'
import { AdminCustomersController } from '../admin/customers.controller'
import { AdminOrdersController } from '../admin/orders.controller'
import { AdminSearchController } from '../admin/search/search.controller'
import { AdminSupportController } from '../admin/support/support.controller'
import { ResellerController } from '../admin/reseller/reseller.controller'
import { AdminConfigController } from '../admin/config/admin-config.controller'

// Services
import { SearchService } from '../admin/search/search.service'
import { ResellerService } from '../admin/reseller/reseller.service'
import { EmailService } from '../../../libs/email/email.service'

@Module({
  controllers: [
    AdminOpsController,
    AdminSystemController,
    AdminSettingsController,
    AdminConfigController,
    AdminBookingsController,
    AdminCustomersController,
    AdminOrdersController,
    AdminSearchController,
    AdminSupportController,
    ResellerController,
  ],
  imports: [AuthModule],
  providers: [SearchService, ResellerService, EmailService],
})
export class AdminModule {}
