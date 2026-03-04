import { enforceEnterpriseFlag } from '../../tenant/enterprise/enterprise.guard'

export type TenantResolver = (tenantId: string) => Promise<{ id: string; isEnterprise: boolean; flags?: string[] } | null>

export type SLASink = (entry: { tenantId: string; durationMs: number; statusCode: number; path?: string }) => Promise<void>

export class SLAResponseTracker {
  constructor(
    private readonly tenantResolver: TenantResolver,
    private readonly sink: SLASink,
  ) {}

  async record(req: any, durationMs: number, statusCode: number) {
    const tenantId = req?.tenant?.id || req?.user?.tenant_id
    if (!tenantId) return
    const tenant = await this.tenantResolver(tenantId)
    if (!tenant) return
    const allowed = enforceEnterpriseFlag(tenant, 'dedicated_rate_limit') || enforceEnterpriseFlag(tenant, 'extended_audit_retention') || enforceEnterpriseFlag(tenant, 'priority_queue')
    if (!allowed) return
    await this.sink({ tenantId, durationMs, statusCode, path: req?.path })
  }
}
