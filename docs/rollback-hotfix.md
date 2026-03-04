# Rollback & Hotfix Strategy

## Code Rollback Steps
1. Identify the last known good release tag.
2. Revert deployment to the last stable build artifact.
3. Restart services and verify health checks.
4. Confirm error rates return to baseline.

## Database Rollback Strategy
1. Evaluate if a schema rollback is required or if data backfill is safer.
2. Restore tenant-scoped data from the latest logical backup if needed.
3. If rollback migration exists, apply it in a controlled maintenance window.
4. Validate data integrity and audit logs after recovery.

## Feature Flag Emergency Shutdown
1. Disable the affected feature flag at the tenant or global scope.
2. Verify the guard prevents access to the risky feature.
3. Monitor errors and confirm stabilization.

## Communication Checklist
- Notify internal incident channel and assign incident lead.
- Inform affected tenants of impact and mitigation timeline.
- Provide periodic status updates during recovery.
- Document root cause and preventive actions post-incident.
