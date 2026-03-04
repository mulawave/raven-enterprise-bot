import { ENTERPRISE_FLAGS } from './enterprise.flags'
import { enforceEnterpriseFlag } from './enterprise.guard'

export const ENTERPRISE_MODULE = [ENTERPRISE_FLAGS, enforceEnterpriseFlag]
