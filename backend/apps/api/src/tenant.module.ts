/**
 * TenantModule — tenant context resolution, branding and onboarding provisioning.
 */
import { Module } from '@nestjs/common'
import { BillingModule } from './billing.module'
import { AuthModule } from './auth.module'

// Controllers
import { TenantContextController } from './tenant-context.controller'
import { BrandingController } from '../admin/branding.controller'
import { AdminTenantsController } from '../admin/tenants/admin-tenants.controller'
import { OnboardingController } from '../admin/onboarding/onboarding.controller'

// Services
import { BrandingService } from '../../../libs/tenant/branding/branding.service'
import { TenantProvisionService } from '../admin/onboarding/tenant.provision.service'

@Module({
  imports: [BillingModule, AuthModule],
  controllers: [
    TenantContextController,
    BrandingController,
    AdminTenantsController,
    OnboardingController,
  ],
  providers: [BrandingService, TenantProvisionService],
  exports: [BrandingService, TenantProvisionService],
})
export class TenantModule {}
