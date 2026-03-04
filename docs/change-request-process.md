# Change Request (CR) Process

Date: 2026-01-30

## Change Categories
- Documentation: docs/ only
- Monitoring/Reporting: read-only additions
- Configuration: environment or feature flags
- Code: backend/apps/ or backend/libs/
- Database: migrations and schema changes

## Approval Flow
1. Submit CR with scope, impact, and rollback plan.
2. Validate against governance-rulebook.md.
3. Documentation/Monitoring: single approver.
4. Configuration/Code/Database: Engineering Lead + Operations Lead.
5. Security-impacting changes require Security Lead approval.

## Risk Assessment Checklist
- Tenant isolation preserved
- No destructive data changes
- Backward compatibility maintained
- Monitoring and audit logging unchanged
- Rollback plan validated
- Performance impact assessed

## Rollback Requirement
- All CRs must include a tested rollback path.
- Migrations must be reversible or have a safe mitigation plan.
