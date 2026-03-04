# Service Ownership & On-Call Rotation

## Purpose
Define clear ownership, on-call coverage, and escalation for all critical services in the current platform.

## 1. Service Ownership (Current Services)
| Service | Owner Team/Role |
| --- | --- |
| API (backend/apps/api) | Platform Engineering |
| Worker (backend/apps/worker) | Platform Engineering |
| AI Engine (backend/libs/ai-engine) | AI Engineering |
| Auth (backend/libs/auth) | Security & Identity |
| Billing (backend/libs/billing) | Finance Systems |
| Booking (backend/libs/booking) | Core Product |
| Cache (backend/libs/cache) | Platform Engineering |
| Compliance (backend/libs/compliance) | Security & Compliance |
| Config (backend/libs/config) | Platform Engineering |
| Messaging (backend/libs/messaging) | Platform Engineering |
| Monitoring (backend/libs/monitoring) | Site Reliability |
| Ordering (backend/libs/ordering) | Core Product |
| Partners (backend/libs/partners) | Integrations |
| Payments (backend/libs/payments) | Payments Engineering |
| Tenant (backend/libs/tenant) | Platform Engineering |

## 2. On-Call Roles
- **Primary On-Call:** First responder, responsible for triage, mitigation, and incident coordination.
- **Secondary On-Call:** Backup responder, supports primary and owns escalation to domain experts.

## 3. Escalation Timelines
- **P0 (Critical, outage or data risk):**
  - Primary response within 15 minutes
  - Escalate to Secondary at 30 minutes if unresolved
  - Escalate to Service Owner and Leadership at 60 minutes
- **P1 (High, major degradation):**
  - Primary response within 30 minutes
  - Escalate to Secondary at 60 minutes if unresolved
  - Escalate to Service Owner at 120 minutes
- **P2 (Moderate):**
  - Primary response within 4 hours
  - Escalate to Secondary at 8 hours if unresolved
- **P3 (Low):**
  - Response within 2 business days

## 4. Handoff Procedure
- **Shift Start:**
  - Review open incidents, alerts, and ongoing work items.
  - Confirm service health dashboards and error budgets.
- **Shift End:**
  - Update incident notes, mitigation status, and next actions.
  - Transfer ownership of active incidents to the next on-call.
  - Post handoff summary in the on-call channel.

---

This policy reflects the current service architecture and is reviewed annually or upon major platform changes.