# System Overview

This system is a multi-tenant backend with an AI-assisted messaging layer, order and booking management, and payment processing. It uses PostgreSQL via Prisma, Redis for session state, and a modular service structure for core domains.

## Core Domains
- AI Engine: intent routing, conversation state, and fallback handling
- Messaging: inbound webhook parsing and outbound messaging
- Ordering: cart and order creation with validation
- Booking: availability checks and booking creation
- Payments: provider integration, verification, and webhook handling
- Monitoring: audit logging and alerting
- Billing: usage tracking per tenant

## Data Sources
- Redis: source of truth for AI session state
- PostgreSQL: source of truth for history and transactional records

## Tenancy Model
All data access is tenant-scoped. Tenant identifiers are required for protected operations and audit logging.

## Operational Safeguards
- AI safeguards prevent confirmation or pricing assertions
- Validations for orders, bookings, and payments
- Rate limiting on messaging, webhooks, and broadcasts
n
## Observability
- Mandatory audit logging for sensitive actions
- Alerting for payment failures, AI fallback spikes, delivery failures, and webhook verification failures
