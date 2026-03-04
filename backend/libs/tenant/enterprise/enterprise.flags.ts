export type EnterpriseFlag = 'dedicated_rate_limit' | 'priority_queue' | 'extended_audit_retention'

export const ENTERPRISE_FLAGS: EnterpriseFlag[] = [
  'dedicated_rate_limit',
  'priority_queue',
  'extended_audit_retention',
]

export function isEnterpriseFlag(flag: string): flag is EnterpriseFlag {
  return ENTERPRISE_FLAGS.includes(flag as EnterpriseFlag)
}
