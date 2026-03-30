import { Controller, Post, Get, Body, Req } from '@nestjs/common'
import { Request } from 'express'
import { LicensingService } from './licensing.service'

@Controller('api/licensing')
export class LicensingController {
  constructor(private readonly licensingService: LicensingService) {}

  @Post('activate')
  async activate(
    @Body() body: { license_key: string; email: string; domain: string },
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '0.0.0.0'
    const userAgent = req.headers['user-agent']

    return this.licensingService.activate({
      license_key: body.license_key,
      email: body.email,
      domain: body.domain,
      ip_address: ip,
      user_agent: userAgent,
    })
  }

  @Post('verify')
  async verify(@Body() body: { verification_token: string; domain: string; fingerprint?: string }) {
    return this.licensingService.verify(body)
  }

  @Get('status')
  async status() {
    return this.licensingService.getLocalStatus()
  }
}
