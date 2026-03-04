# Release v1

Date: 2026-01-29

## Scope
Production freeze for MVP release.

## Environment Variable Usage
- DATABASE_URL in backend/prisma/prisma.config.ts
- REDIS_URL in backend/apps/api/rate-limit.middleware.ts
- WHATSAPP_VERIFY_TOKEN in backend/apps/api/messaging/webhook.controller.ts

## Debug Code Review
No console.log or debugger usage detected in backend or dashboard source.

## Docker References
No Dockerfile or docker-compose files found in the repository. The docker/ directory is empty, so service references cannot be verified.

## Release Notes
- Audit and compliance logging enforced for sensitive actions.
- Conversation state handling hardened with Redis rehydration and expiration handling.
- Rate limiting added to messaging, payment webhooks, and broadcast endpoints.
- Backend fail-safes enforced for AI, ordering, booking, and payments.
