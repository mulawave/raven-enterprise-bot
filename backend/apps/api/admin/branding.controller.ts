import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { BrandingService, BrandingConfig } from '../../../libs/tenant/branding/branding.service'

@Controller('tenant/branding')
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  /**
   * Get branding configuration for a tenant
   * GET /api/tenant/branding?tenantId=xxx
   */
  @Get()
  async getBranding(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      return { error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } }
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
  async setBranding(@Body() body: { tenantId: string } & BrandingConfig) {
    const { tenantId, ...config } = body

    if (!tenantId) {
      return { error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' } }
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
