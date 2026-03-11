# Raven Enterprise Platform — Production Status Report
**Date:** March 11, 2026  
**Status:** ✅ Stable — First Production Deployment Confirmed

---

## Executive Summary

Raven Enterprise is a multi-tenant AI-powered customer engagement platform. Businesses (tenants) get a branded dashboard to manage their WhatsApp/Instagram/Facebook AI bot, ordering system, bookings, payments, and customer conversations. A central admin console manages all tenants, subscriptions, billing, and system configuration.

As of March 11, 2026, the platform has reached its **first fully functional production deployment**. All public services are live and verified end-to-end.

---

## Live Services

| Service | URL | Status |
|---|---|---|
| **Admin Console** | https://admin.raven-ai.online/admin/login | ✅ Live — login working |
| **Tenant Dashboard** | https://app.raven-ai.online | ✅ Live — loads correctly |
| **Backend API** | https://api.raven-ai.online | ✅ Live — JWT auth verified |

**Admin credentials:** `admin@raven.ai` / `SuperAdmin123!`

---

## Infrastructure

### Server
- **Host:** cPanel shared hosting (cpanel.raven-ai.online / 66.29.149.90)
- **Proxy stack:** `Browser → nginx (ea-nginx, cache 60min) → Apache → Passenger / PM2`

### Running Processes

| PM2 Name | Port | Technology | Role |
|---|---|---|---|
| `raven-api` | 4010 | NestJS (Node 20) | REST API + webhook receiver |
| `raven-dashboard` | 4011 | Next.js 14 standalone | Tenant-facing portal |
| `raven-admin` (Passenger) | 4012 | Next.js 14 standalone | Admin console |
| `raven-worker` | — | BullMQ worker | Background job processor |
| Redis | 6379 | Redis | Queue broker + session storage |
| PostgreSQL | 5432 | PostgreSQL | Primary database (`ravenai_prod`) |

### Build IDs (Current Stable)
- Admin: `Cnpu2Q4e151l5H9oOXU36`
- Dashboard: `xu_0BhMeZOtdplwaYH6_X`

---

## Feature Status

### ✅ Fully Implemented

#### Authentication & Security
- JWT HS256 — dual auth flows: SUPER_ADMIN (system scope) + Tenant users (tenant scope)
- bcrypt password hashing (10 rounds)
- 8 route guards enforcing role, scope, plan limits, feature flags, enterprise tier
- Admin console Next.js middleware redirects to login on unauthenticated access
- Redis sliding-window rate limiting (100 req/min per tenant, 50/min per IP)
- HMAC-256 webhook verification (WhatsApp, Paystack)

#### Multi-Tenancy
- Full DB-level isolation: every entity carries `tenant_id` FK with cascade delete
- Branch-level RBAC for staff users (`StaffBranch` junction + `StaffScopeService`)
- Tenant suspend/unsuspend at API level
- Per-tenant feature flags

#### Tenant Provisioning (Admin)
- Atomic creation: Tenant + owner user + default branch + subscription in one transaction
- Plan assignment (Starter / Growth / Enterprise)
- Tenant detail view with counts

#### Ordering System
- Menu categories + items (per tenant)
- Cart-based order creation with branch + tenant ownership validation
- Staff-scoped order lists
- Full `Order` + `OrderAudit` trail

#### Booking System
- Room type management per tenant
- Date-range availability checks
- Booking creation with room-type ownership validation
- `Booking` + `BookingAudit` trail

#### Payments
- Paystack payment initialization + webhook handler (HMAC-SHA512, idempotent)
- Payments linked to orders and bookings
- Full `Payment` + `PaymentAudit` history

#### Messaging & AI Bot
- Meta webhook verification (WhatsApp, Instagram, Facebook channel adapters)
- BullMQ async queue for all inbound messages
- **AI pipeline:** 13-intent classifier → 7-state conversation FSM → GPT-4o response
- Outbound worker: 200 msg/min, 5 retries with exponential backoff
- Per-conversation Redis session state with TTL
- Conversation list UI in tenant dashboard

#### Subscription & Billing

| Tier | Price | Conversations | Overage |
|---|---|---|---|
| Starter | ₦49,000/mo | 500 | ₦120/conversation |
| Growth | ₦199,000/mo | 2,500 | ₦100/conversation |
| Enterprise | ₦799,000/mo | 12,000 | ₦80/conversation |

- Plans editable via admin console; DB values override code constants
- `BillingLifecycleService`: hourly grace checks, daily charge trigger, weekly data purge
- `UsageTracker`: tracks messages, orders, bookings, broadcasts per tenant
- Auto-suspend on missed payment; auto-reactivate on successful payment

#### Admin Console (17 pages)
Login, Dashboard overview, Tenant list + create, Tenant detail, Plans management, Billing/payment history, Admin users CRUD, Customers (cross-tenant), Orders (cross-tenant), Bookings (cross-tenant), Ops / queue stats, System health, App settings, Admin profile + avatar, Payment config, Email config, API keys

#### Tenant Dashboard (14 pages)
Login, Overview / KPIs, Conversations, Broadcast, Customers, Orders, Bookings, Payments, Analytics, Subscription / plan usage, Settings / branding, Onboarding guide, Privacy policy, Terms of service

#### Other Systems
- Audit log (admin + tenant actions → `AuditLog` table)
- GDPR: `ConsentTracker` + `RightToEraseHandler` + `DataRetentionService`
- SLA response tracking (enterprise tier only)
- Cross-tenant broadcast messages (WhatsApp bulk send)
- Reseller / white-label accounts
- Analytics aggregation (daily order/booking/payment sums)
- Reports: SLA compliance, AI usage, revenue by branch, messaging volume, payment volume
- CSV/JSON export

---

### ⚠️ Partially Implemented

| Item | Gap | Impact |
|---|---|---|
| Plan tier naming | `plan.rules.ts` uses `FREE/BASIC/PRO`; billing uses `starter/growth/enterprise` | Plan enforcement may have gaps |
| Admin system health | BullMQ queue depth shows "unknown" | Ops visibility only |
| Flutterwave | Service exists; not wired into PaymentController | Paystack only active |
| Actual subscription charge execution | `ChargeExecutor` exists; Paystack recurring charge not confirmed wired | Payments not auto-charged |
| Email delivery | `EmailService` exists; end-to-end SMTP not confirmed | Welcome/invoice emails may not send |
| `BackupWorker` / `RestoreWorker` | Code present; no cron schedule | DB auto-backups not running |
| Dead-letter / retry worker | Handlers exist; wiring unverified | Failed jobs may be lost |
| `ResellerGuard` | Partial implementation | Reseller RBAC incomplete |

---

## Database

**30 tables** in `ravenai_prod`. Key tables: `Tenant`, `User`, `Branch`, `Customer`, `Conversation`, `Message`, `Order`, `Booking`, `Payment`, `Subscription`, `Plan`, `AuditLog`, `SystemConfig`, `FeatureFlag`, `Usage`, `Invoice`.

---

## Deployment Operations

### Stable Fallback
Snapshot at `~/snapshots/stable-2026-03-11` (77MB).

**One-command rollback:** `bash ~/raven-enterprise-bot/deploy/restore-stable.sh`

### Deploying Updates (from Windows)
```powershell
# Full deploy (all services)
.\scripts\deploy-to-prod.ps1

# Single service
.\scripts\deploy-to-prod.ps1 -Service admin   # admin-console only
.\scripts\deploy-to-prod.ps1 -Service dash    # dashboard only
.\scripts\deploy-to-prod.ps1 -Service api     # backend only

# Deploy and save new stable snapshot
.\scripts\deploy-to-prod.ps1 -Snapshot
```

### Manual Recovery

```powershell
# Check status
ssh raven-user 'pm2 list'

# Restart services
ssh raven-user 'pm2 restart raven-dashboard'
ssh raven-user 'bash ~/restart-admin2.sh'           # admin-console (Passenger)
ssh raven-user 'pm2 restart raven-api raven-worker'

# Clear nginx cache (run as root)
ssh raven-server 'rm -rf /var/cache/ea-nginx/proxy/ravenai/*'

# Full rollback
ssh raven-user 'bash ~/raven-enterprise-bot/deploy/restore-stable.sh'
```

---

## Git History

```
71c3e06  fix: stable production deployment — admin console + dashboard fully operational
a4bd842  feat: 2-col admin layouts, email split editor/preview, public landing page, legal pages, tenant guide
3d64df6  fix: add pgcrypto extension to migrations, fix deploy script ecosystem path
747c9dd  feat: AI→WhatsApp wiring, queue health, dark UI, orders/customers pages, premium home
0b759c5  Add ADMIN_USERS endpoint to API_ENDPOINTS
eab59ea  Fix tsconfig rootDir, nest-cli, express type casts, env.validator
a9049b9  Fix Express Request type casts in libs for Linux build
ded69e9  Initial commit — Raven Enterprise platform
```

> **No remote configured.** Recommendation: add GitHub remote and push for off-server backup and CI/CD.

---

## Recommended Next Steps (Priority Order)

1. **Set up git remote** — `git remote add origin git@github.com:yourorg/raven-enterprise-bot.git && git push -u origin master`
2. **Provision first real tenant** — walk through the onboarding plan (see `docs/tenant-onboarding-plan.md`)
3. **Wire Paystack subscription charging** — connect `ChargeExecutor` to the billing lifecycle trigger
4. **Fix plan-tier naming** — unify `plan.rules.ts` to use `starter/growth/enterprise`
5. **Confirm email delivery** — configure SMTP in admin settings and test welcome email
6. **Connect BullMQ stats** — fix "queue depth: unknown" in ops dashboard
7. **WhatsApp number setup UI** — allow tenants to register their Meta phone number in the dashboard
8. **Flutterwave activation** — wire `FlutterwaveService` into `PaymentController` as a second provider
