# Production Environment Configuration

## Required Environment Variables

### Backend API
- DATABASE_URL
- REDIS_URL
- WHATSAPP_VERIFY_TOKEN

### Worker Jobs
- DATABASE_URL

## Validation Rules
- DATABASE_URL must be a valid PostgreSQL connection string.
- REDIS_URL must be a valid Redis connection string.
- WHATSAPP_VERIFY_TOKEN must be set for webhook verification.

## Schema Lock
Only the variables listed in this document are permitted for production runtime configuration. Additions require explicit review and update to this document.

## Secrets Handling
- All secrets must be provided via environment variables at deploy time.
- No secrets are stored in source control.
- No hardcoded credentials are allowed in runtime code.
