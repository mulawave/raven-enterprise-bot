import { Controller, Post, Body, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { TenantProvisionService } from './tenant.provision.service'

@Controller('admin/onboarding')
export class OnboardingController {
  constructor(private readonly provisionService: TenantProvisionService) {}

  @Post('provision')
  async provision(
    @Body() body: {
      tenantName?: string
      owner?: { email: string; password: string }
      staff?: { email: string; password: string }
    },
  ) {
    const { tenantName, owner, staff } = body
    if (!tenantName || !owner?.email || !owner?.password || !staff?.email || !staff?.password) {
      throw new BadRequestException('INVALID_INPUT')
    }
    return this.provisionService.provision({ tenantName, owner, staff })
  }
}
