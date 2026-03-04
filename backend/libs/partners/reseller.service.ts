import { PrismaClient } from '@prisma/client'

export type ResellerAccount = {
  id: string
  name: string
  email: string
  created_at: Date
}

export type TenantAssignment = {
  reseller_id: string
  tenant_id: string
  assigned_at: Date
}

export class ResellerService {
  constructor(private readonly prisma: PrismaClient, private readonly auditLogger: { log: (entry: any) => Promise<void> }) {}

  async createReseller(name: string, email: string): Promise<ResellerAccount> {
    const reseller = await (this.prisma as any).resellerAccount.create({ data: { name, email } })
    await this.auditLogger.log({ action: 'RESELLER_CREATED', entity_id: reseller.id, timestamp: new Date() })
    return reseller
  }

  async assignTenant(resellerId: string, tenantId: string): Promise<TenantAssignment> {
    const assignment = await (this.prisma as any).tenantAssignment.create({ data: { reseller_id: resellerId, tenant_id: tenantId } })
    await this.auditLogger.log({ action: 'TENANT_ASSIGNED', entity_id: assignment.tenant_id, reseller_id: resellerId, timestamp: new Date() })
    return assignment
  }

  async listTenants(resellerId: string): Promise<{ tenant_id: string }[]> {
    return (this.prisma as any).tenantAssignment.findMany({ where: { reseller_id: resellerId }, select: { tenant_id: true } })
  }
}
