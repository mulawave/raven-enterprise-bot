import { Controller, Get, NotFoundException, UnauthorizedException, UseGuards } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { BrandingService } from '../../../libs/tenant/branding/branding.service'
import { SubscriptionsService } from '../../../libs/billing/subscriptions.service'
import { SuspensionService } from '../../../libs/billing/enforcement/suspension.service'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'

@Controller('tenant/context')
export class TenantContextController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly brandingService: BrandingService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly suspensionService: SuspensionService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getTenantContext(@CurrentUser() user: any) {
    const tenantId = user?.tenant_id
    if (!tenantId) {
      throw new UnauthorizedException('Tenant credentials required')
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      throw new NotFoundException(`Tenant '${tenantId}' not found`)
    }

    const subscription = await this.subscriptionsService.getSubscription(tenantId)

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
        plan: subscription?.plan_tier ?? 'starter',
        status: subscription?.status ?? 'trial',
        conversations_used: subscription?.conversations_used ?? 0,
        conversations_limit: subscription?.conversations_limit ?? 0,
        current_period_end: subscription?.current_period_end
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
