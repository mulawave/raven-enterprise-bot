/**
 * TenantModule — tenant context resolution, branding and onboarding provisioning.
 */
import { Module } from '@nestjs/common'
import { BillingModule } from './billing.module'
import { AuthModule } from './auth.module'
import { AppConfigModule } from './app-config.module'

// Controllers
import { TenantContextController } from './tenant-context.controller'
import { BrandingController } from '../admin/branding.controller'
import { AdminTenantsController } from '../admin/tenants/admin-tenants.controller'
import { AdminResetController } from '../admin/reset/admin-reset.controller'
import { OnboardingController } from '../admin/onboarding/onboarding.controller'
import { TenantBankingController } from './tenant-banking.controller'

// Services
import { BrandingService } from '../../../libs/tenant/branding/branding.service'
import { TenantProvisionService } from '../admin/onboarding/tenant.provision.service'

@Module({
  imports: [BillingModule, AuthModule, AppConfigModule],
  controllers: [
    TenantContextController,
    BrandingController,
    AdminTenantsController,
    AdminResetController,
    OnboardingController,
    TenantBankingController,
  ],
  providers: [BrandingService, TenantProvisionService],
  exports: [BrandingService, TenantProvisionService],
})
export class TenantModule {}
