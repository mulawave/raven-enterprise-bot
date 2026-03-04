# Deployment Checklist

## Environment
- DATABASE_URL configured
- REDIS_URL configured
- WHATSAPP_VERIFY_TOKEN configured

## Services
- PostgreSQL accessible and migrations applied
- Redis reachable for session storage and rate limiting
n
## Integrity
- Audit logging enabled
- Alerts service enabled
- Rate limiting middleware active

## Backups
- pg_dump available for logical backups
- pg_restore or psql available for tenant restores

## Smoke Tests
- Messaging webhook verification responds correctly
- Order and booking creation paths validate and complete
- Payment verification and webhook updates succeed
