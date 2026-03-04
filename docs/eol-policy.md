# End-of-Lifecycle (EOL) Policy

## Purpose
To ensure a safe, compliant, and orderly sunset or major rewrite of the platform, protecting customers, data integrity, and operational continuity.

## 1. EOL Triggers
EOL may be initiated under any of the following conditions:
- Major architectural rewrite requiring deprecation of current platform
- End of vendor support for critical dependencies with no viable upgrade path
- Sustained operational risk or cost exceeding approved thresholds
- Regulatory changes requiring platform replacement
- Strategic business decision to sunset or merge services

## 2. Customer Notification Timelines
- **Initial Notice:** Minimum 180 days prior to EOL date
- **Reminder Notice:** 90 days prior to EOL date
- **Final Notice:** 30 days prior to EOL date
- **Critical Changes:** Immediate notification if legal or security issues force accelerated timelines

Notifications must be sent through official customer communication channels and documented in operational records.

## 3. Data Export Guarantees
- **Export Availability:** Data export tools and APIs remain available until EOL date.
- **Supported Formats:** CSV and JSON for all tenant-accessible datasets.
- **Retention Window:** Customer data remains accessible for export for a minimum of 180 days after initial notice.
- **Verification:** Customers may request export verification prior to shutdown.

## 4. Shutdown Procedures
- **Phase 1 — Freeze:**
  - Disable new tenant onboarding and non-essential feature updates.
  - Announce final service timeline.
- **Phase 2 — Read-Only Mode:**
  - Transition platform to read-only for all tenants.
  - Ensure audit logs and reporting remain accessible.
- **Phase 3 — Final Export & Confirmation:**
  - Complete all requested exports.
  - Confirm data transfer and tenant acknowledgment.
- **Phase 4 — Decommission:**
  - Shut down application services, background workers, and integrations.
  - Archive operational logs and audit trails.
  - Securely delete tenant data per retention and compliance requirements.

## 5. Governance & Compliance
- EOL execution requires approval by engineering leadership, security, and operations.
- All actions must be documented for audit and legal compliance.

---

This policy reflects the current multi-tenant, modular architecture and is reviewed annually or upon major platform changes.