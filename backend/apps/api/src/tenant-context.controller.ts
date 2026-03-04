import { Controller, Get, Query, Headers, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { BrandingService } from '../../../libs/tenant/branding/branding.service'
import { SubscriptionsService, PlanTier } from '../../../libs/billing/subscriptions.service'
import { SuspensionService } from '../../../libs/billing/enforcement/suspension.service'

@Controller('tenant/context')
export class TenantContextController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly brandingService: BrandingService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly suspensionService: SuspensionService,
  ) {}

  @Get()
  async getTenantContext(
    @Query('tenantId') tenantIdQuery: string,
    @Headers('x-tenant-id') tenantIdHeader: string,
  ) {
    const tenantId = tenantIdHeader || tenantIdQuery
    if (!tenantId) {
      throw new BadRequestException('tenantId is required')
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      throw new NotFoundException(`Tenant '${tenantId}' not found`)
    }

    let subscription = await this.subscriptionsService.getSubscription(tenantId)
    if (!subscription) {
      await this.subscriptionsService.createSubscription(tenantId, 'starter' as PlanTier)
      subscription = await this.subscriptionsService.getSubscription(tenantId)
    }

    if (!subscription) {
      throw new NotFoundException('Subscription could not be created for this tenant')
    }

    const branding = await this.brandingService.getBranding(tenantId)

    let primaryColor = '#111827'
    let whatsappNumber = ''

    if (branding?.theme) {
      try {
        const parsed = JSON.parse(branding.theme)
        if (typeof parsed?.primary === 'string' && parsed.primary.trim().length > 0) {
          primaryColor = parsed.primary
        } else if (typeof parsed?.primaryColor === 'string' && parsed.primaryColor.trim().length > 0) {
          primaryColor = parsed.primaryColor
        }
        if (typeof parsed?.whatsappNumber === 'string') {
          whatsappNumber = parsed.whatsappNumber
        }
      } catch {
        // Ignore invalid theme
      }
    }

    const isSuspended = await this.suspensionService.isSuspended(tenantId)
    const tenantStatus = isSuspended ? 'SUSPENDED' : subscription?.status === 'active' ? 'ACTIVE' : 'TRIAL'

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenantStatus,
      },
      subscription: {
        plan: subscription.plan_tier,
        status: subscription.status,
        conversations_used: subscription.conversations_used ?? 0,
        conversations_limit: subscription.conversations_limit ?? 0,
        current_period_end: subscription.current_period_end
          ? subscription.current_period_end.toISOString()
          : new Date().toISOString(),
      },
      branding: {
        businessName: branding?.name || tenant.name || '',
        logoUrl: branding?.logoUrl || tenant.logo_url || '',
        primaryColor,
        whatsappNumber,
      },
      features: {
        ordering: true,
        bookings: true,
        payments: true,
        messaging: true,
      },
    }
  }
}
