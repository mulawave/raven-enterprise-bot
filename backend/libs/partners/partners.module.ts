import { ResellerService } from './reseller.service'
import { resellerGuard } from './reseller.guard'

export const PARTNERS_MODULE = [ResellerService, resellerGuard]
