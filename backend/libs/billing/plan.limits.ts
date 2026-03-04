import { UsageKey } from './usage.tracker'

export type PlanLimits = Record<UsageKey, number | null>

export const DEFAULT_LIMITS: PlanLimits = {
  messages_processed: null,
  orders_created: null,
  bookings_created: null,
  broadcasts_sent: null,
}
