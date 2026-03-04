import { ENTERPRISE_FLAGS, EnterpriseFlag } from './enterprise.flags'

export function enforceEnterpriseFlag(tenant: { id: string; isEnterprise: boolean; flags?: string[] }, flag: EnterpriseFlag): boolean {
  if (!tenant.isEnterprise) return false
  return tenant.flags?.includes(flag) ?? false
}
