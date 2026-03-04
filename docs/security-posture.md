# Security Posture

Date: 2026-01-30

## Authentication Model
- JWT-based authentication for admin/staff access
- Token issuance handled by backend auth service
- Customer role is not permitted to authenticate via admin auth flow

## Authorization & Isolation
- Role checks enforced via guards and middleware
- Tenant scoping enforced in request handling and data queries
- Admin access uses explicit tenant selection for support tools

## Data Encryption
- At rest: Not specified in codebase
- In transit: Not specified in codebase

## Webhook Verification
- Messaging webhook verification via shared token check
- Verify token compared to configured environment secret

## Incident Response Summary
- Documented rollback and hotfix procedures
- Monitoring and audit logging enabled for sensitive operations
