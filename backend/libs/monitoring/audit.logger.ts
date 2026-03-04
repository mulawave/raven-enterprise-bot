import { PrismaClient } from '@prisma/client'

/**
 * Known audit action constants.
 * Extend this union when adding new auditable events.
 * AI intent actions are stored as `AI_INTENT:<intent>` strings — the prefix
 * is queried with `startsWith` so they cannot be a closed enum.
 */
export const AUDIT_ACTIONS = {
  // Ordering
  ORDER_CREATED:          'ORDER_CREATED',
  ORDER_STATUS_CHANGED:   'ORDER_STATUS_CHANGED',
  // Bookings
  BOOKING_CREATED:        'BOOKING_CREATED',
  BOOKING_CANCELLED:      'BOOKING_CANCELLED',
  // Payments
  PAYMENT_INITIALIZED:    'PAYMENT_INITIALIZED',
  PAYMENT_SUCCEEDED:      'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED:         'PAYMENT_FAILED',
  // Tenant management
  TENANT_SUSPENDED:       'TENANT_SUSPENDED',
  TENANT_ACTIVATED:       'TENANT_ACTIVATED',
  // Resellers
  RESELLER_CREATED:       'RESELLER_CREATED',
  TENANT_ASSIGNED:        'TENANT_ASSIGNED',
  TENANT_UNASSIGNED:      'TENANT_UNASSIGNED',
  // Subscriptions
  SUBSCRIPTION_CHANGED:   'SUBSCRIPTION_CHANGED',
  // AI intents: stored as AI_INTENT:<intent_name> — prefix-queried
  AI_INTENT_PREFIX:       'AI_INTENT:',
} as const

export type AuditAction =
  | (typeof AUDIT_ACTIONS)[Exclude<keyof typeof AUDIT_ACTIONS, 'AI_INTENT_PREFIX'>]
  | `AI_INTENT:${string}`

export interface AuditLogEntry {
  tenant_id: string
  entity_id: string
  action: AuditAction | string  // string fallback for legacy callers
  timestamp: Date
}

export class AuditLogger {
  constructor(private readonly prisma: PrismaClient) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenant_id: entry.tenant_id,
        entity_id: entry.entity_id,
        action: entry.action,
        timestamp: entry.timestamp,
      },
    })
  }
}
