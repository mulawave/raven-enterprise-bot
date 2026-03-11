# Raven Enterprise Bot — Audit Fix Plan

Last updated: March 9, 2026  
Source audit: [AUDIT-REPORT.md](AUDIT-REPORT.md)

---

## 1. Executive Summary

This document converts the open audit findings into a **non-breaking execution plan**.

The highest-risk problems have now been remediated in code:
- tenant dashboard authentication now uses JWT-backed tenant login
- staff-only tenant APIs derive tenant context from verified JWTs
- `/uploads` no longer accepts fake tenant identifiers as authorization
- branch resolution no longer creates persistent state during request handling
- rate limiting no longer keys off attacker-controlled tenant/channel headers

The main remaining work is:
- formalizing public-safe tenant identifiers for intentionally public routes
- adding automated regression coverage for the fixed trust-boundary paths
- completing the remaining framework-major dependency audit findings

### Immediate goal

Fix the vulnerable code paths **in place**, preserve intended functionality, and close every audit finding with evidence.

### Out of scope

- architecture redesign
- module mergers or service decomposition beyond what is required to fix the findings
- adding new third-party infrastructure
- changing product behavior that is not required by the audit

---

## 2. Non-Breaking Rules

These rules govern every task in this plan:

1. Do **not** introduce blanket shutdowns or generic maintenance mode.
2. Do **not** remove functionality unless a replacement path is implemented in the same workstream.
3. Keep public-safe behavior public **only when intentionally documented**.
4. Protected endpoints must derive tenant identity server-side.
5. Read paths and middleware must not create persistent state.
6. Every completed task must include validation evidence.
7. Any breaking change must be flagged explicitly in this document before implementation.

---

## 3. Do-Not-Change Guardrails

- Do not redesign the platform architecture.
- Do not merge modules just to make a fix convenient.
- Do not add new external managed services.
- Do not silently change public API behavior without documenting it here.
- Do not treat client-side local storage, headers, or query params as authoritative authorization state.
- Do not “temporarily” disable features without an explicit restoration task in the same plan.

---

## 4. Status Legend

- [ ] Not started
- [-] In progress
- [x] Completed
- [!] Blocked

Priority labels:
- `P0` critical before release
- `P1` high priority
- `P2` follow-up hardening

Effort labels:
- `S` small
- `M` medium
- `L` large

Risk labels:
- Security risk: Low / Medium / High / Critical
- Regression risk: Low / Medium / High
- Complexity: Low / Medium / High

---

## 5. Assumptions

These assumptions should be validated during execution:

1. The currently audited tenant-facing routes are not heavily relied on in production traffic.
2. Customer-facing menu browsing and availability checks are intended to remain public-safe.
3. Staff/owner listings of orders, bookings, and payment status should be protected.
4. Branding assets such as logo and favicon may legitimately be public-facing.
5. Profile avatar access may need stricter protection than branding assets.
6. Dashboard currently relies on tenant context loading via [dashboard/components/TenantProvider.tsx](dashboard/components/TenantProvider.tsx).
7. Dashboard protected API calls now attach `Authorization: Bearer <token>` via [dashboard/lib/api.ts](dashboard/lib/api.ts).

If any assumption proves false, update this document before implementation continues.

---

## 6. Open Questions Requiring Explicit Decisions

These are not optional. They must be resolved before the corresponding implementation tasks are marked complete.

1. Should `POST /api/ordering/orders` remain customer-facing, or become staff-only?
2. Should `POST /api/bookings` remain customer-facing, or become staff-only?
3. Should `GET /api/payments/verify` remain public for checkout return flows?
4. Should `GET /api/payments/status` remain staff-only, or have a separate public opaque-token path?
5. Should `GET /tenant/context` be split into public branding context and protected operational context?
6. Should branding assets use public URLs, signed URLs, or authenticated retrieval?
7. Is there already a public-safe tenant identifier available, or must one be introduced?

---

## 7. Decision Log

Record major decisions here as they are made.

| Date | Decision | Rationale | Approved by |
|---|---|---|---|
| 2026-03-09 | Fix in place; no generic disable phase | Preserve behavior while correcting trust boundaries | Recorded |
| 2026-03-09 | Dashboard tenant access uses JWT email/password login | Removes tenant-ID-only pseudo-auth while preserving dashboard flow | Recorded |
| 2026-03-09 | Branding assets remain public; avatars require authenticated retrieval | Matches asset sensitivity without query-token leakage | Recorded |
| 2026-03-09 | Apply only non-breaking dependency upgrades during the audit pass | Cleared `axios`/`qs` findings and advanced Next/Nest within current major lines without forcing a risky framework migration | Recorded |

---

## 8. Current Consumer Map

Known current consumers based on code inspection:

| Area | Consumer | Evidence |
|---|---|---|
| Tenant auth login | Dashboard login page | [dashboard/app/login/page.tsx](dashboard/app/login/page.tsx) |
| Tenant context | Dashboard tenant bootstrap | [dashboard/components/TenantProvider.tsx](dashboard/components/TenantProvider.tsx) |
| Generic tenant API helper | Dashboard client requests | [dashboard/lib/api.ts](dashboard/lib/api.ts) |
| Settings logo/favicon uploads | Admin console/backend admin settings flow | [backend/apps/api/admin/settings/admin-settings.controller.ts](backend/apps/api/admin/settings/admin-settings.controller.ts) |
| Profile avatar upload | Admin console/backend admin profile flow | [backend/apps/api/admin/profile/admin-profile.controller.ts](backend/apps/api/admin/profile/admin-profile.controller.ts) |
| Payment webhook | Paystack | [backend/apps/api/src/payment.controller.ts](backend/apps/api/src/payment.controller.ts) |

Anything not confirmed should be marked as `Unknown` in the task registry until validated.

---

## 9. Route Inventory and Classification Tracker

This is the authoritative route matrix for the currently audited backend surface.

| Route | Current consumer | Current auth/input model | Data sensitivity | Recommended final model | Backward compatibility | Task owner |
|---|---|---|---|---|---|---|
| `GET /api/ordering/menu/categories` | Public/customer flow (assumed) | `tenantId` query | Customer-safe | Public-safe route using public tenant identifier | Likely compatible with query change only |  |
| `GET /api/ordering/menu/items` | Public/customer flow (assumed) | `tenantId` query + optional `categoryId` | Customer-safe | Public-safe route using public tenant identifier | Likely compatible with query change only |  |
| `POST /api/ordering/orders` | Unknown / customer checkout (assumed) | body with `cart`, `branchId` | Tenant write | Public-write with validated public context or protected route | May require contract tightening |  |
| `GET /api/ordering/orders` | Staff/owner (assumed) | `tenantId` + `branchId` query | Staff-only | Protected | Breaking for anonymous callers only |  |
| `GET /api/ordering/orders/:id` | Staff/owner (assumed) | `tenantId` + `branchId` query | Staff-only | Protected | Breaking for anonymous callers only |  |
| `GET /api/bookings/room-types` | Public/customer flow (assumed) | `tenantId` query | Customer-safe | Public-safe route using public tenant identifier | Likely compatible with query change only |  |
| `GET /api/bookings/availability` | Public/customer flow (assumed) | `tenantId` + `roomTypeId` | Customer-safe | Public-safe route using public tenant identifier | Likely compatible with query change only |  |
| `POST /api/bookings` | Unknown / customer booking (assumed) | body `tenantId`, `branchId`, booking fields | Tenant write | Public-write with validated public context or protected route | May require contract tightening |  |
| `GET /api/bookings` | Staff/owner (assumed) | `tenantId` + `branchId` query | Staff-only | Protected | Breaking for anonymous callers only |  |
| `GET /api/bookings/:id` | Staff/owner (assumed) | `tenantId` + `branchId` query | Staff-only | Protected | Breaking for anonymous callers only |  |
| `POST /api/payments/initialize` | Checkout flow (assumed) | body `tenantId`, `orderId`, `bookingId` | Tenant write / payment | Public-write or split route; infer tenant from resource | May require request-contract change |  |
| `GET /api/payments/verify` | Checkout return flow (assumed) | query `tenantId`, `reference`, `provider` | Customer-safe / payment state | Public-safe or split route; infer from `reference` | May require query-contract change |  |
| `GET /api/payments/status` | Staff/owner (assumed) | query `tenantId`, `orderId`, `bookingId` | Staff-only | Protected or separate opaque-token public path | Likely breaking if public clients exist |  |
| `POST /api/payments/webhook/paystack` | Paystack | signature only | Provider-only | Public webhook with strict signature validation | Compatible |  |
| `GET /tenant/context` | Dashboard bootstrap | query/header `tenantId` | Mixed: branding + subscription/status | Split public-safe and protected concerns | Likely contract change |  |

### Identity rules by route type

| Route type | Allowed client identifier | Server-side source of truth |
|---|---|---|
| Protected staff route | None for tenant authority | `req.user.tenant_id` and authorized branch scope |
| Public read route | Public tenant identifier | Tenant resolved from public-safe identifier |
| Public write route | Public tenant/branch identifier | Server validates ownership before any write |
| Payment verification route | Payment/reference identifier | Tenant resolved from payment/order/booking record |
| Upload retrieval | Signed token or authenticated principal | JWT, signed URL token, or documented public asset rule |

---

## 10. Upload Asset Matrix

Current upload-producing code paths:
- settings logo upload in [backend/apps/api/admin/settings/admin-settings.controller.ts](backend/apps/api/admin/settings/admin-settings.controller.ts)
- settings favicon upload in [backend/apps/api/admin/settings/admin-settings.controller.ts](backend/apps/api/admin/settings/admin-settings.controller.ts)
- admin profile avatar upload in [backend/apps/api/admin/profile/admin-profile.controller.ts](backend/apps/api/admin/profile/admin-profile.controller.ts)

| Asset type | Storage path | Current retrieval path | Sensitivity | Recommended retrieval model | Notes |
|---|---|---|---|---|---|
| Settings logo | `./uploads/settings` | `/uploads/settings/<file>` | Public branding | Public or signed URL | Likely safe to expose publicly if branding is intended public |
| Settings favicon | `./uploads/settings` | `/uploads/settings/<file>` | Public branding | Public or signed URL | Likely safe to expose publicly if branding is intended public |
| Admin profile avatar | `./uploads/avatars` | `/uploads/avatars/<file>` | User profile / internal | Authenticated or signed URL | Should not rely on fake tenant header bypass |

### Upload design rules

1. Remove `x-tenant-id` / `?t=` as an authorization mechanism in [backend/apps/api/src/main.ts](backend/apps/api/src/main.ts).
2. Public branding assets may remain public **only by explicit decision**, not accidental bypass.
3. Protected assets must use JWT or signed URLs.
4. Cache behavior must be documented for any public assets.

---

## 11. Branch Context Matrix

Current issue source:
- [backend/libs/tenant/branch.middleware.ts](backend/libs/tenant/branch.middleware.ts)
- [backend/libs/tenant/branch.service.ts](backend/libs/tenant/branch.service.ts)

| Operation | Current behavior | Allowed? | Final rule |
|---|---|---|---|
| Read branch context from request | trusts `x-tenant-id` header | No | Must use verified tenant context on protected routes |
| Fall back to default branch | auto-creates branch | No | May resolve existing default branch only if already provisioned |
| Create default branch on request | yes | No | Default branch creation belongs only in onboarding/provisioning |
| Create branch explicitly | service method exists | Yes | Allowed only through explicit onboarding/admin flows |

### No-silent-side-effects rule

- Middleware may not create DB state.
- Read paths may not provision defaults.
- Failed auth may not partially mutate data.

---

## 12. Rate Limiting Strategy Matrix

Current implementation is in [backend/apps/api/rate-limit.middleware.ts](backend/apps/api/rate-limit.middleware.ts).

| Route group | Current key | Current weakness | Recommended key | Target limit strategy | Abuse case addressed |
|---|---|---|---|---|---|
| Protected tenant routes | `x-tenant-id` | spoofable | verified tenant ID + optional user ID | tenant/user scoped | header spoof bypass |
| Public tenant-safe routes | `x-tenant-id` | spoofable and arbitrary | IP + route + public tenant identifier | per-IP/tenant burst limits | enumeration and scraping |
| Webhooks | `x-channel-id` | spoofable | signature-valid source + route/IP strategy | provider-aware limit | fake header bypass |

### Required throttling documentation

For each externally reachable route group, document:
- key source
- limit
- window
- whether it is identity-based, IP-based, or both
- expected false-positive risk

---

## 13. Frontend Impact Matrix

Known relevant client code:
- [dashboard/lib/api.ts](dashboard/lib/api.ts) currently sends `x-tenant-id`
- [dashboard/components/TenantProvider.tsx](dashboard/components/TenantProvider.tsx) currently calls `/tenant/context?tenantId=...` and also sets `x-tenant-id`

| Backend change area | Current frontend dependency | Impact | Required frontend follow-up |
|---|---|---|---|
| Protected tenant route auth | Dashboard generic API helper | High | Update helper to use final auth mechanism; stop assuming header-only tenant context |
| Public tenant context split | TenantProvider bootstrap | High | Move branding/public context fetch to public-safe route; protected fields to auth route if needed |
| Upload retrieval model | Branding/profile asset rendering | Medium | Update URLs or signed access flow depending on final asset policy |
| Payment verify/status changes | Checkout/return flows if any | Medium | Ensure public verification path remains viable if intended |

### Frontend security rule

Frontend state may guide UX, but must not determine backend authorization. Local storage values are never sufficient proof of tenant scope.

---

## 14. Milestones

### Milestone 1 — Route Classification and Decisions
- Decide public vs protected per route
- Decide public tenant identifier strategy
- Decide tenant context split strategy

### Milestone 2 — Backend Auth and Tenant Isolation
- Apply explicit protection where required
- Remove trusted client `tenantId` from protected routes
- Validate ownership relationships at controller/service boundaries

### Milestone 3 — Uploads, Branch, and Rate Limit Hardening
- Replace upload bypass logic
- remove branch side effects from request flow
- switch throttling to trustworthy identity sources

### Milestone 4 — Client Alignment, Tests, and Closeout
- align dashboard with final route model
- add regression coverage
- update audit statuses and evidence logs

---

## 15. Task Registry

Use this table as the authoritative execution tracker.

| ID | Task | Priority | Effort | Security risk | Regression risk | Dependencies | Owner | Reviewer | Approver | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| A-1 | Classify every tenant-facing route | P0 | M | Critical | Medium | None |  |  |  | [-] |
| A-2 | Decide authoritative tenant identity sources | P0 | M | Critical | Medium | A-1 |  |  |  | [x] |
| A-3 | Decide public tenant identifier strategy | P0 | M | High | Medium | A-1 |  |  |  | [ ] |
| A-4 | Decide tenant-context split model | P0 | M | High | Medium | A-1 |  |  |  | [ ] |
| B-1 | Protect staff-only order routes | P0 | M | Critical | High | A-1,A-2 |  |  |  | [x] |
| B-2 | Protect staff-only booking routes | P0 | M | Critical | High | A-1,A-2 |  |  |  | [x] |
| B-3 | Protect staff-only payment status routes | P0 | M | Critical | High | A-1,A-2 |  |  |  | [x] |
| B-4 | Remove trusted client `tenantId` on protected routes | P0 | L | Critical | High | B-1,B-2,B-3 |  |  |  | [x] |
| B-5 | Validate cross-resource ownership in service layer | P0 | L | Critical | Medium | B-4 |  |  |  | [x] |
| B-6 | Split public-safe and protected route behavior where needed | P1 | L | High | High | A-1,A-4,B-4 |  |  |  | [ ] |
| B-7 | Correct `TenantMiddleware` assumptions | P1 | M | High | Medium | A-2 |  |  |  | [ ] |
| C-1 | Replace `/uploads` fake tenant bypass | P0 | M | High | Medium | A-1 |  |  |  | [x] |
| C-2 | Finalize public vs protected asset policy | P0 | M | High | Low | C-1 |  |  |  | [x] |
| D-1 | Remove branch auto-create from middleware flow | P0 | M | High | Medium | None |  |  |  | [x] |
| D-2 | Move default branch creation into explicit provisioning | P1 | M | Medium | Medium | D-1 |  |  |  | [ ] |
| D-3 | Resolve branch from verified tenant context only | P0 | M | High | Medium | A-2,D-1 |  |  |  | [x] |
| E-1 | Replace spoofable throttle keys | P1 | M | High | Medium | A-1,A-2 |  |  |  | [x] |
| E-2 | Document route-level throttle strategies | P2 | S | Medium | Low | E-1 |  |  |  | [ ] |
| F-1 | Align dashboard API helper with final backend auth model | P1 | M | High | High | B-6,C-2 |  |  |  | [x] |
| F-2 | Align tenant bootstrap flow with final tenant-context model | P1 | M | High | High | A-4,B-6 |  |  |  | [x] |
| G-1 | Add auth bypass regression tests | P0 | M | Critical | Low | B-4,B-5 |  |  |  | [x] |
| G-2 | Add uploads authorization regression tests | P0 | S | High | Low | C-1,C-2 |  |  |  | [x] |
| G-3 | Add branch side-effect regression tests | P0 | S | High | Low | D-1,D-3 |  |  |  | [x] |
| G-4 | Add rate-limit bypass regression tests | P1 | S | Medium | Low | E-1 |  |  |  | [x] |
| G-5 | Add manual QA signoff for customer/staff flows | P1 | M | Medium | Medium | F-1,F-2,G-1,G-2,G-3 |  |  |  | [ ] |
| H-1 | Reconcile stale audit statuses | P1 | S | Medium | Low | G-1,G-2,G-3,G-4 |  |  |  | [x] |
| H-2 | Record evidence and final signoff | P1 | S | Low | Low | H-1 |  |  |  | [-] |

**Dependency hardening note (March 9):**
- backend non-breaking upgrades applied: `axios@^1.13.6`, `qs@^6.15.0` via `overrides`, NestJS 10 packages advanced to latest 10.x patch line
- admin console and dashboard both advanced to `next@^14.2.35`
- residual `npm audit` findings now sit behind framework-major upgrades (`NestJS 11` / newer `Next.js` line) and remain open by design for a separate migration window

---

## 16. Endpoint-by-Endpoint Implementation Checklist

### OrderingController

**File:** [backend/apps/api/src/ordering.controller.ts](backend/apps/api/src/ordering.controller.ts)

#### `GET /api/ordering/menu/categories`
- [ ] Confirm route remains public-safe.
- [ ] Replace raw `tenantId` trust with public tenant identifier.
- [ ] Ensure response includes only customer-safe menu metadata.
- [ ] Add negative test for invalid public tenant identifier.

#### `GET /api/ordering/menu/items`
- [ ] Replace raw `tenantId` trust with public tenant identifier.
- [ ] Validate `categoryId` belongs to the resolved tenant.
- [ ] Add cross-tenant category regression test.

#### `POST /api/ordering/orders`
- [ ] Decide public-write vs protected route.
- [ ] Stop trusting arbitrary tenant/branch pairings.
- [ ] Validate branch ownership before order creation.
- [ ] Add regression test for forged branch/tenant combinations.

#### `GET /api/ordering/orders`
- [ ] Protect explicitly.
- [ ] Remove client authority over `tenantId`.
- [ ] Scope listing to verified tenant context.

#### `GET /api/ordering/orders/:id`
- [ ] Protect explicitly.
- [ ] Resolve order only inside verified tenant scope.
- [ ] Add cross-tenant lookup regression test.

### BookingController

**File:** [backend/apps/api/src/booking.controller.ts](backend/apps/api/src/booking.controller.ts)

#### `GET /api/bookings/room-types`
- [ ] Confirm route remains public-safe.
- [ ] Replace raw `tenantId` trust with public tenant identifier.
- [ ] Limit response to bookable public metadata.

#### `GET /api/bookings/availability`
- [ ] Keep public only if required for booking UX.
- [ ] Resolve tenant from public-safe identifier.
- [ ] Validate `roomTypeId` ownership.

#### `POST /api/bookings`
- [ ] Decide public-write vs protected route.
- [ ] Stop trusting body `tenantId`.
- [ ] Validate branch and room type ownership.
- [ ] Add spoofed body regression test.

#### `GET /api/bookings`
- [ ] Protect explicitly.
- [ ] Remove client authority over `tenantId` and `branchId`.
- [ ] Add anonymous access regression test.

#### `GET /api/bookings/:id`
- [ ] Protect explicitly.
- [ ] Resolve booking only inside verified tenant scope.
- [ ] Add cross-tenant lookup regression test.

### PaymentController

**File:** [backend/apps/api/src/payment.controller.ts](backend/apps/api/src/payment.controller.ts)

#### `POST /api/payments/initialize`
- [ ] Decide public-write vs split route.
- [ ] Stop trusting body `tenantId` as authoritative.
- [ ] Infer tenant from referenced order/booking where possible.
- [ ] Reject mismatched resource ownership.

#### `GET /api/payments/verify`
- [ ] Decide whether it remains public-safe.
- [ ] Resolve context from payment reference rather than trusted `tenantId` query.
- [ ] Keep response minimal if public.

#### `GET /api/payments/status`
- [ ] Decide staff-only vs separate public opaque-token path.
- [ ] If staff-only, protect explicitly and derive tenant from auth context.
- [ ] If public path exists, document and implement it separately.

#### `POST /api/payments/webhook/paystack`
- [ ] Keep signature validation intact.
- [ ] Add invalid signature regression test.

### TenantContextController

**File:** [backend/apps/api/src/tenant-context.controller.ts](backend/apps/api/src/tenant-context.controller.ts)

#### `GET /tenant/context`
- [ ] Split public branding data from protected operational data if needed.
- [ ] Remove trusted `x-tenant-id` header as primary authority.
- [ ] Ensure public requests do not cause hidden side effects such as subscription creation unless explicitly approved.
- [ ] Add regression tests for anonymous access to protected fields.

---

## 17. Service-Layer Validation Checklist

These validations must exist even after controller/auth fixes.

- [ ] `branchId` belongs to resolved tenant
- [ ] `categoryId` belongs to resolved tenant
- [ ] `roomTypeId` belongs to resolved tenant
- [ ] `orderId` belongs to resolved tenant
- [ ] `bookingId` belongs to resolved tenant
- [ ] payment `reference` resolves to the correct tenant/resource
- [ ] any public tenant identifier maps only to its own tenant

---

## 18. Regression Test Matrix by Audit Finding

| Audit finding | Required automated coverage | Status |
|---|---|---|
| Tenant API auth/isolation | unauthenticated tenant-context access rejected; tenant login rejects non-tenant scope; staff order/booking branch scope enforced; cross-tenant payment status and forged create-flow resource access rejected | [x] |
| Upload bypass | fake `x-tenant-id` rejected; fake `?t=` rejected | [x] |
| Branch side effects | request flow does not create default branch | [x] |
| Rate limit bypass | spoofed headers do not bypass throttling | [x] |
| Tenant context split/protection | anonymous callers cannot read protected operational fields | [x] |

---

## 19. Manual QA Checklist

Run these after implementation and before signoff.

- [ ] Public menu/category flow still works if intentionally public
- [ ] Public room types/availability flow still works if intentionally public
- [ ] Customer checkout flow still works if intended public
- [ ] Staff order listing rejects anonymous access and works for authorized users
- [ ] Staff booking listing rejects anonymous access and works for authorized users
- [ ] Payment verify flow works for intended public return path or protected equivalent
- [ ] Branding assets still load under the final approved retrieval model
- [ ] Avatar retrieval follows the final approved retrieval model
- [ ] Dashboard tenant bootstrap still succeeds under the final route design
- [ ] No surprise branch records are created during normal requests

---

## 20. Pre-Deploy Checklist

- [ ] Route inventory is fully classified
- [ ] Open questions are resolved or explicitly deferred with approval
- [ ] Code review completed
- [ ] Automated regression tests added and passing
- [ ] Manual QA completed
- [ ] Frontend impact reviewed
- [ ] Rollback steps documented for changed areas
- [ ] Audit status updates prepared but not yet marked fixed without evidence

---

## 21. Post-Deploy Verification Checklist

- [ ] Protected order routes reject anonymous access
- [ ] Protected booking routes reject anonymous access
- [ ] Protected payment status routes reject anonymous access
- [ ] Intended public-safe routes still work
- [ ] `/uploads` no longer accepts fake `x-tenant-id`
- [ ] `/uploads` no longer accepts fake `?t=`
- [ ] Valid asset retrieval paths still work
- [ ] Branch resolution no longer creates records on ordinary requests
- [ ] Payment webhook still accepts valid signatures and rejects invalid ones
- [ ] No unexpected spike in 401/403/500 responses

---

## 22. Monitoring and Observability Checks

Monitor these signals during and after rollout:

- 401/403 volume on tenant-facing routes
- order creation success/failure rate
- booking creation success/failure rate
- payment initialize/verify failure rate
- upload access denial rate
- branch resolution error rate
- rate-limit hit rate by route group

---

## 23. Rollback / Backout Notes

| Area | Main risk | Rollback note |
|---|---|---|
| Protected route auth | legitimate clients lose access | revert only the specific auth change after identifying missing client credential alignment |
| Tenant context split | dashboard bootstrap fails | restore prior route behavior temporarily only if the public/protected replacement path is not yet wired |
| Upload retrieval | images fail to load | revert retrieval gate changes only after classifying which asset type lost access |
| Branch middleware | branch context missing in flows | restore non-mutating branch lookup only; do not restore auto-create-on-read |
| Rate limiting | false positives throttle valid traffic | relax limits or key strategy while preserving spoof-resistance |

Rollback is not a substitute for route classification. Any rollback must preserve the core audit fix where possible.

---

## 24. Audit Report Reconciliation Checklist

Before [AUDIT-REPORT.md](AUDIT-REPORT.md) is updated to mark findings fixed again:

- [ ] stale “fixed” status lines identified
- [ ] implementation completed
- [ ] automated tests added
- [ ] manual QA completed
- [ ] deploy verification completed
- [ ] evidence recorded below

---

## 25. Phase-by-Phase Definition of Done

### Phase / Milestone 1 Done
- every audited route is classified as public-safe, public-write, protected, or webhook-only
- tenant identity source is documented for each route type

### Phase / Milestone 2 Done
- protected routes use verified auth context
- client-provided tenant identity is not authoritative on protected routes
- service-layer ownership validation exists for cross-resource operations

### Phase / Milestone 3 Done
- upload bypass removed
- branch middleware no longer mutates DB state
- throttle keys use trustworthy identity inputs

### Phase / Milestone 4 Done
- frontend is aligned
- regression tests pass
- audit report and evidence logs match reality

---

## 26. Global Definition of Done

This plan is complete only when all of the following are true:

- every tenant-facing route is explicitly classified as public or protected
- protected routes use verified auth context as the tenant source of truth
- public routes expose only intentionally public-safe data
- `/uploads` no longer accepts fake tenant headers/query params as authorization
- branch resolution no longer creates persistent state during ordinary requests
- rate limiting uses a trustworthy identity strategy
- dashboard calls match the final backend auth design
- regression tests cover the March 8 findings
- [AUDIT-REPORT.md](AUDIT-REPORT.md) status lines match reality

---

## 27. Evidence Requirements Per Completed Task

Each completed task must record:

1. files changed
2. tests added or updated
3. build/test result
4. manual verification notes where applicable
5. reviewer signoff

---

## 28. Task Evidence Log

| Task | Status | Date | Files | Validation | Notes |
|---|---|---|---|---|---|
| A-1 | [ ] |  |  |  |  |
| A-2 | [ ] |  |  |  |  |
| A-3 | [ ] |  |  |  |  |
| A-4 | [ ] |  |  |  |  |
| B-1 | [ ] |  |  |  |  |
| B-2 | [ ] |  |  |  |  |
| B-3 | [ ] |  |  |  |  |
| B-4 | [ ] |  |  |  |  |
| B-5 | [ ] |  |  |  |  |
| B-6 | [ ] |  |  |  |  |
| B-7 | [ ] |  |  |  |  |
| C-1 | [ ] |  |  |  |  |
| C-2 | [ ] |  |  |  |  |
| D-1 | [ ] |  |  |  |  |
| D-2 | [ ] |  |  |  |  |
| D-3 | [ ] |  |  |  |  |
| E-1 | [ ] |  |  |  |  |
| E-2 | [ ] |  |  |  |  |
| F-1 | [ ] |  |  |  |  |
| F-2 | [ ] |  |  |  |  |
| G-1 | [x] | 2026-03-09 | `backend/apps/api/src/tenant-context.controller.spec.ts`, `backend/apps/api/src/tenant-auth.controller.spec.ts`, `backend/apps/api/src/ordering.controller.spec.ts`, `backend/apps/api/src/booking.controller.spec.ts`, `backend/apps/api/src/payment.controller.spec.ts` | `npm test -- --runInBand` (backend): 12 suites, 44 tests passing; `npm run build` (backend) passes | Covers missing tenant credentials, non-tenant login rejection, non-tenant `/me` rejection, missing tenant rejection, staff order/booking branch-scope enforcement, cross-tenant payment status denial, forged create-flow branch/room/resource rejection, and no subscription create-on-read side effect |
| G-2 | [x] | 2026-03-09 | `backend/apps/api/src/uploads-auth.middleware.ts`, `backend/apps/api/src/uploads-auth.middleware.spec.ts`, `backend/apps/api/src/main.ts` | `npm test -- --runInBand` (backend): 12 suites, 44 tests passing; `npm run build` (backend) passes | Extracted upload auth into a testable helper; verified public settings assets stay public and fake header/query bypasses are rejected |
| G-3 | [x] | 2026-03-09 | `backend/libs/tenant/branch.middleware.spec.ts` | `npm test -- --runInBand` (backend): 12 suites, 44 tests passing | Verifies verified tenant context only, invalid branch rejection, and no default-branch create-on-read |
| G-4 | [x] | 2026-03-09 | `backend/apps/api/rate-limit.middleware.spec.ts` | `npm test -- --runInBand` (backend): 12 suites, 44 tests passing | Verifies JWT-derived tenant throttling and IP fallback when JWT verification fails |
| G-5 | [ ] |  |  |  |  |
| H-1 | [x] | 2026-03-09 | `AUDIT-REPORT.md`, `AUDIT-FIX-PLAN.md` | Dependency status reconciled to March 9 audit outputs; regression coverage updated to 12 suites / 44 tests; backend tests pass; dashboard/admin builds pass | Remaining dependency finding narrowed but still open pending major framework upgrades |
| H-2 | [-] | 2026-03-09 | `backend/package.json`, `backend/package-lock.json`, `admin-console/package.json`, `admin-console/package-lock.json`, `dashboard/package.json`, `dashboard/package-lock.json` | `npm audit --omit=dev` rerun in all three packages after upgrades | Final signoff blocked on remaining major-upgrade advisories plus pending regression/manual QA tasks |

---

## 29. Blocking Issues

Use this section to record blockers as they appear.

| Date | Blocker | Affected tasks | Resolution |
|---|---|---|---|
| 2026-03-09 | Remaining `npm audit` findings require major framework upgrades (`NestJS 11` and newer `Next.js` line) | H-2, deployment closeout | Deferred into a separate controlled upgrade window after the audit hardening pass |
|  |  |  |  |
|  |  |  |  |

---

## 30. Final Signoff

| Role | Name | Date | Status | Notes |
|---|---|---|---|---|
| Engineering |  |  | [ ] |  |
| Security |  |  | [ ] |  |
| QA |  |  | [ ] |  |
| Deployment verification |  |  | [ ] |  |
