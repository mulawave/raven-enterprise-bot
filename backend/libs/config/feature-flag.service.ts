import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class FeatureFlagService {
  constructor(private readonly prisma: PrismaClient) {}

  async isEnabled(tenantId: string, flag: string): Promise<boolean> {
    const entry = await this.prisma.featureFlag.findFirst({ where: { tenant_id: tenantId, flag } })
    return !!entry && entry.enabled === true
  }

  async setFlag(tenantId: string, flag: string, enabled: boolean): Promise<void> {
    await this.prisma.featureFlag.upsert({
      where: { tenant_id_flag: { tenant_id: tenantId, flag } },
      update: { enabled },
      create: { tenant_id: tenantId, flag, enabled },
    })
  }
}
