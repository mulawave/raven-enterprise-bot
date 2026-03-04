# Governance Rulebook

Date: 2026-01-30

## Changes Allowed Without Review
- Documentation updates in docs/
- Non-functional formatting changes
- Read-only reporting additions
- Monitoring dashboards and queries

## Changes Requiring Technical Review
- Any code changes in backend/apps/
- Any changes to backend/libs/ that affect runtime behavior
- Database migrations or schema updates
- Authentication, authorization, or tenant isolation logic
- Payment, booking, ordering, and messaging workflows
- Cache behavior, TTLs, or invalidation rules

## Forbidden Changes
- Bypassing tenant scoping or access controls
- Disabling audit logging or monitoring
- Introducing in-memory state for shared workflows
- Mutations in read-only tools and reports
- Removing backward compatibility for v1 endpoints

## Emergency Override Conditions
- Active security incident
- Data integrity risk
- Production outage with customer impact
- Legal or compliance mandate with immediate deadline

## Ownership Responsibilities
- Engineering Lead: approves technical changes and ensures rollback plans
- Security Lead: approves security-impacting changes
- Operations Lead: monitors stability, incident response, and comms
- Product Owner: approves scope changes and release timelines
