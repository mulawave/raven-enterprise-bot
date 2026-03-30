import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../auth/guards/super-admin.guard'
import { LicensingService } from './licensing.service'

@Controller('admin/licensing')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class LicensingAdminController {
  constructor(private readonly licensingService: LicensingService) {}

  @Get('keys')
  async listKeys(@Query('status') status?: string, @Query('type') type?: string) {
    return this.licensingService.listKeys({ status, type })
  }

  @Post('keys/generate')
  async generateKey(
    @Body() body: { type: 'REGULAR' | 'EXTENDED'; buyer_email: string; buyer_name: string; max_domains?: number },
  ) {
    return this.licensingService.generateKey(body)
  }

  @Patch('keys/:id/revoke')
  async revokeKey(@Param('id') id: string) {
    return this.licensingService.revokeKey(id)
  }

  @Get('activations')
  async listActivations(@Query('status') status?: string, @Query('license_id') licenseId?: string) {
    return this.licensingService.listActivations({ status, license_id: licenseId })
  }

  @Patch('activations/:id/approve')
  async approveActivation(@Param('id') id: string) {
    return this.licensingService.approveActivation(id)
  }

  @Patch('activations/:id/revoke')
  async revokeActivation(@Param('id') id: string) {
    return this.licensingService.revokeActivation(id)
  }

  @Get('attempts')
  async listAttempts(@Query('status') status?: string, @Query('domain') domain?: string) {
    return this.licensingService.listAttempts({ status, domain })
  }
}
