# Incident Simulations & Recovery

## Payment Webhook Outage
**Simulation:** Block incoming webhook requests from payment providers for 30 minutes.
**Impact:** Payment status updates stall; orders/bookings remain pending.
**Detection:** Alert on webhook verification failures and payment failure spikes.
**Recovery Steps:**
1. Restore webhook ingress and verify signatures.
2. Reprocess missed events using provider verification APIs.
3. Update affected payment statuses via backfill.
4. Confirm audit logs for each recovered payment.

## Redis Failure
**Simulation:** Stop Redis or make it unreachable for 15 minutes.
**Impact:** AI session state and rate limiting degrade; sessions rehydrate on restart.
**Detection:** Alerts for AI fallback spikes and session anomalies.
**Recovery Steps:**
1. Restore Redis connectivity.
2. Rehydrate AI sessions from defaults; verify conversation continuity.
3. Validate rate limiting keys repopulate as traffic resumes.
4. Audit AI decisions during the window for anomalies.

## Messaging API Downtime
**Simulation:** Force outbound messaging API to return 5xx for 20 minutes.
**Impact:** Outbound message delivery fails; retries and DLQ engage.
**Detection:** Alert on message delivery failures and retry exhaustion.
**Recovery Steps:**
1. Confirm upstream provider recovery.
2. Resume retry worker processing.
3. Drain DLQ by reattempting permanent failures.
4. Validate delivery success rates return to baseline.

## Database Failover
**Simulation:** Promote a standby database and restart connections.
**Impact:** Short-lived DB errors; possible write failures during cutover.
**Detection:** Error rates increase; audit logging failures may appear.
**Recovery Steps:**
1. Update DATABASE_URL if required and restart services.
2. Validate read/write operations and Prisma connectivity.
3. Re-run failed operations from audit logs and job queues.
4. Verify backups and restore procedures remain functional.
