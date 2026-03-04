# Developer Handbook

Date: 2026-01-30

## System Overview
- Multi-tenant backend with strict isolation
- Modular services for ordering, booking, payments, messaging, and AI routing
- Read-only monitoring, profiling, and reporting layers
- Worker subsystem for retries, backups, analytics, and simulations

## Module Responsibilities
- auth: authentication, authorization, tenant scoping
- booking: availability, room types, bookings
- ordering: cart, menu, orders, status
- payments: payment initialization, verification, webhooks
- ai-engine: intent routing, session state, fallback safety
- monitoring: audit logging, metrics, profiling, SLA
- messaging: inbound/outbound adapters and parsing
- compliance: retention, consent, erasure
- billing: plans, enforcement, usage tracking
- tenant: branding, branches, enterprise flags
- partners: reseller provisioning and tenant assignments

## Data Flow Diagrams (Text)
1) Messaging → AI → Orders/Bookings
Inbound message → parser → intent router → validation → deterministic response → audit log

2) Ordering Flow
Customer request → cart → order service → payment → audit log → status updates

3) Booking Flow
Customer request → availability → booking service → payment → audit log → status updates

4) Monitoring Flow
API/worker actions → audit logger → metrics/profiling → reports

5) Support & Reporting
Admin/support endpoints → tenant-scoped reads → exports/reports

## Guardrails Summary
- Tenant isolation enforced at query level and middleware
- Read-only instrumentation; no behavior changes
- Explicit tenant selection for admin/support tools
- No AI confirmation for availability or payments
- Strict audit logging for sensitive operations
- Feature flags for enterprise-only features
