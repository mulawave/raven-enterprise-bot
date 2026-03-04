import { PriorityRequestInterceptor } from './priority.interceptor'
import { SLAResponseTracker } from './sla.tracker'

export const SLA_SERVICES = [PriorityRequestInterceptor, SLAResponseTracker]
