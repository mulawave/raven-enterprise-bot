import { Controller, Get, Post, Body, HttpCode, HttpStatus, UnauthorizedException, UseGuards } from '@nestjs/common'
import { BrandingService, BrandingConfig } from '../../../libs/tenant/branding/branding.service'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'

@Controller('tenant/branding')
@UseGuards(JwtAuthGuard)
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  /**
   * Get branding configuration for a tenant
   * GET /api/tenant/branding?tenantId=xxx
   */
  @Get()
  async getBranding(@CurrentUser() user: any) {
    const tenantId = user?.tenant_id
    if (!tenantId) {
      throw new UnauthorizedException('Tenant credentials required')
    }

    const branding = await this.brandingService.getBranding(tenantId)
    return branding
  }

  /**
   * Update branding configuration
   * POST /api/tenant/branding
   * Body: { tenantId: string, name?: string, logoUrl?: string, theme?: string }
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async setBranding(@CurrentUser() user: any, @Body() config: BrandingConfig) {
    const tenantId = user?.tenant_id

    if (!tenantId) {
      throw new UnauthorizedException('Tenant credentials required')
    }

    // Validate theme JSON if provided
    if (config.theme) {
      try {
        JSON.parse(config.theme)
      } catch (error) {
        return { error: { code: 'VALIDATION_ERROR', message: 'theme must be valid JSON' } }
      }
    }

    await this.brandingService.setBranding(tenantId, config)
    return { success: true, message: 'Branding updated successfully' }
  }
}
