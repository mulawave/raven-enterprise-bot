import { PrismaClient } from '@prisma/client'

export class TenantService {
  constructor(private readonly prisma: PrismaClient) {}

  async getTenant(tenantId: string) {
    return this.prisma.tenant.findFirst({ where: { id: tenantId } })
  }

  async getBranding(tenantId: string) {
    const tenant = await this.getTenant(tenantId)
    return {
      name: tenant?.name,
      logoUrl: tenant?.logo_url,
      theme: tenant?.theme,
    }
  }
}
