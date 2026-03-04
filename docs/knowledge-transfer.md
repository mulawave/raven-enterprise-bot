# Knowledge Transfer Snapshot

Date: 2026-01-30

## System Mental Model
- Multi-tenant SaaS backend with strict tenant isolation
- Deterministic business logic for ordering, booking, payments
- AI layer performs routing and fallback only
- Workers handle retries, backups, analytics, and simulations
- Monitoring is read-only and audit-first

## Where Critical Logic Lives
- Ordering: backend/libs/ordering/
- Booking: backend/libs/booking/
- Payments: backend/libs/payments/
- Messaging adapters: backend/apps/api/messaging/
- AI routing and safety: backend/libs/ai-engine/
- Tenant scoping and guards: backend/libs/auth/ and backend/libs/tenant/
- Audit logging: backend/libs/monitoring/audit.logger.ts
- Admin support tools: backend/apps/api/admin/support/

## How to Debug Common Failures
- Check audit logs for failed actions and tenant scope
- Validate Redis connectivity for session and rate-limits
- Verify webhook tokens in environment variables
- Inspect queue retries and deadletter handling
- Review payment provider responses and status

## How to Safely Extend the System
- Keep tenant scoping in all queries
- Add new features behind flags when possible
- Maintain backward compatibility for v1 endpoints
- Ensure changes are read-only if adding reports or monitoring
- Add migrations with additive-only changes
