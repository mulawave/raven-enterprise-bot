import { enforceEnterpriseFlag } from '../../tenant/enterprise/enterprise.guard'

export type TenantResolver = (tenantId: string) => Promise<{ id: string; isEnterprise: boolean; flags?: string[] } | null>

export type NextHandler = () => Promise<any>

export class PriorityRequestInterceptor {
  constructor(
    private readonly tenantResolver: TenantResolver,
  ) {}

  async intercept(req: any, next: NextHandler) {
    const tenantId = req?.tenant?.id || req?.user?.tenant_id
    if (!tenantId) return next()
    const tenant = await this.tenantResolver(tenantId)
    if (!tenant) return next()
    const allowed = enforceEnterpriseFlag(tenant, 'priority_queue')
    if (allowed) {
      req.priority = true
    }
    return next()
  }
}
