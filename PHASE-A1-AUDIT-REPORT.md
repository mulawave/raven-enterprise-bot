# 🧩 PHASE A1 — ADMIN BACKEND READINESS AUDIT REPORT

**Date:** February 1, 2026  
**Phase Objective:** Establish complete, explicit, production-ready backend contract for Enterprise Admin Console  
**Audit Status:** ✅ COMPLETE

---

## EXECUTIVE SUMMARY

### Audit Scope
This audit evaluates the existing backend infrastructure against 7 required admin domains to determine readiness for building an Enterprise Admin Console UI.

### Critical Findings

#### ✅ STRENGTHS
1. **Tenant provisioning exists** with atomic transaction-based creation
2. **Subscription management fully implemented** with plan tiers and usage tracking
3. **Admin role awareness exists** in multiple controllers with role guards
4. **Comprehensive data access** via tenant-scoped endpoints
5. **Suspension/activation infrastructure** present in billing enforcement layer

#### ⚠️ GAPS IDENTIFIED
1. **No centralized admin authentication endpoint** (`POST /admin/auth/login` does not exist)
2. **No system-level admin identity model** (admin users are tenant-scoped)
3. **No cross-tenant listing endpoints** for global admin views
4. **No plan management CRUD** (plans are hardcoded constants)
5. **No revenue aggregation endpoint** for MRR/ARR tracking
6. **No queue health monitoring endpoint** for worker observability
7. **Missing tenant status mutation endpoint** (`PATCH /admin/tenants/:id/status`)

#### 🔴 CRITICAL BLOCKERS
1. **Admin authority is implicit, not explicit** - No `SUPER_ADMIN` role or system-level scope
2. **No admin-specific authentication flow** - Relies on tenant auth with role check
3. **No seeded super admin user** - Bootstrap process undefined

---

## DETAILED AUDIT BY DOMAIN

---

# 1️⃣ AUTH & IDENTITY (ADMIN)

## Required Endpoints

| Method | Endpoint             | Status | Implementation Path | Notes |
| ------ | -------------------- | ------ | ------------------- | ----- |
| POST   | `/admin/auth/login`  | ❌ MISSING | N/A | No dedicated admin login |
| POST   | `/admin/auth/logout` | ❌ MISSING | N/A | No logout mechanism |
| GET    | `/admin/auth/me`     | ❌ MISSING | N/A | No identity endpoint |

## Current State

### Authentication Infrastructure
**File:** `backend/libs/auth/services/auth.service.ts`

```typescript
async login(user: User) {
  const payload: any = { sub: user.id, role: user.role };
  if (user.role !== 'admin') payload.tenant_id = user.tenant_id;
  return {
    access_token: this.jwtService.sign(payload),
  };
}
```

**Analysis:**
- ✅ JWT-based auth exists
- ✅ Admin role recognized (`user.role !== 'admin'`)
- ⚠️ Admin users are **tenant-scoped** (have `tenant_id` in User model)
- ❌ No system-level admin identity
- ❌ No dedicated `/admin/auth/login` endpoint

### Role Guard Implementation
**File:** `backend/libs/auth/guards/roles.guard.ts`

```typescript
canActivate(context: ExecutionContext): boolean {
  const roles = this.reflector.get<string[]>('roles', context.getHandler());
  if (!roles) return true;
  const request = context.switchToHttp().getRequest();
  const user = request.user;
  return roles.includes(user.role);
}
```

**Analysis:**
- ✅ Role-based guard exists and is functional
- ✅ Can enforce `@Roles(['admin'])` decorator
- ⚠️ No distinction between tenant admin and super admin

### User Model (Prisma Schema)
**File:** `backend/prisma/schema.prisma`

```prisma
model User {
  id         String   @id @default(uuid())
  tenant_id  String   // ⚠️ ALL users are tenant-scoped
  email      String   @unique
  password   String
  role       String   // 'owner' | 'staff' | 'admin'
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  
  tenant Tenant @relation(...)
}
```

**Analysis:**
- ❌ **CRITICAL:** No system-level admin user model
- ❌ Admin users require `tenant_id` (cannot be tenant-agnostic)
- ✅ Role field exists and is used

### Audit Questions & Answers

| Question | Answer | Evidence |
| -------- | ------ | -------- |
| Does admin auth exist? | **PARTIAL** - General auth exists, no admin-specific flow | `auth.service.ts` |
| Is it tenant-agnostic? | **NO** - Admin users are tenant-scoped | `schema.prisma` User model |
| Is there a seeded super admin? | **NO** - No bootstrap mechanism found | N/A |
| Is role enforcement implemented? | **YES** - RolesGuard functional | `roles.guard.ts` |

### Gap Summary
- ❌ **Missing:** Dedicated admin authentication endpoints
- ❌ **Missing:** System-level admin identity (no `tenant_id`)
- ❌ **Missing:** Super admin seeding process
- ⚠️ **Partial:** Role enforcement works but no SUPER_ADMIN concept

---

# 2️⃣ TENANT MANAGEMENT (CORE)

## Required Endpoints

| Method | Endpoint                    | Status | Implementation Path | Notes |
| ------ | --------------------------- | ------ | ------------------- | ----- |
| POST   | `/admin/tenants`            | ✅ EXISTS | `admin/onboarding/onboarding.controller.ts` | Called `provision` |
| GET    | `/admin/tenants`            | ❌ MISSING | N/A | No list all endpoint |
| GET    | `/admin/tenants/:id`        | ⚠️ PARTIAL | `libs/auth/tenant.service.ts::getTenant` | Not exposed as admin endpoint |
| PATCH  | `/admin/tenants/:id/status` | ❌ MISSING | N/A | No status mutation |
| DELETE | ❌                           | N/A | N/A | Correctly not implemented |

## Current State

### Tenant Provisioning
**File:** `backend/apps/api/admin/onboarding/tenant.provision.service.ts`

```typescript
async provision(input: TenantProvisionInput) {
  return this.prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: input.tenantName },
    })
    
    const owner = await tx.user.create({
      data: {
        tenant_id: tenant.id,
        email: input.owner.email,
        password: input.owner.password,
        role: 'owner',
      },
    })
    
    // Creates staff, menu category, menu item, room type
    return { tenant, owner, staff, botConfig, ... }
  })
}
```

**Controller:** `backend/apps/api/admin/onboarding/onboarding.controller.ts`

```typescript
async provision(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'FORBIDDEN' })
  }
  // ... creates tenant with owner and staff
}
```

**Analysis:**
- ✅ **Atomic provisioning** - Uses transaction
- ✅ **Admin role guard** - Checks `req.user.role !== 'admin'`
- ✅ **Complete initialization** - Creates tenant, users, sample data
- ✅ **Returns READY tenant** - No half-initialized state
- ❌ **No route registered** - Endpoint exists but not in API routing

### Tenant Retrieval
**File:** `backend/libs/auth/tenant.service.ts`

```typescript
async getTenant(tenantId: string) {
  return this.prisma.tenant.findFirst({ where: { id: tenantId } })
}
```

**Analysis:**
- ✅ Service method exists
- ❌ Not exposed as admin endpoint
- ❌ No "list all tenants" capability

### Suspension Infrastructure
**File:** `backend/libs/billing/enforcement/suspension.service.ts`

```typescript
async suspendTenant(tenantId: string): Promise<void> {
  await this.prisma.tenant.update({ where: { id: tenantId }, data: { suspended: true } })
}

async unsuspendTenant(tenantId: string): Promise<void> {
  await this.prisma.tenant.update({ where: { id: tenantId }, data: { suspended: false } })
}
```

**Schema Support:** `Tenant` model has `suspended` field (implied from usage)

**Analysis:**
- ✅ Suspend/unsuspend logic exists
- ✅ Database field supported
- ❌ Not exposed as admin endpoint
- ❌ No activation workflow

### Audit Questions & Answers

| Question | Answer | Evidence |
| -------- | ------ | -------- |
| Does tenant creation exist? | **YES** - Fully atomic provisioning | `tenant.provision.service.ts` |
| Is provisioning atomic? | **YES** - Uses Prisma transaction | Transaction wrapper |
| Are half-initialized tenants possible? | **NO** - Transaction ensures atomicity | Service implementation |
| Can admin override tenant state? | **YES** - Suspend/unsuspend exists | `suspension.service.ts` |

### Gap Summary
- ❌ **Missing:** `GET /admin/tenants` (list all)
- ❌ **Missing:** `GET /admin/tenants/:id` (admin endpoint)
- ❌ **Missing:** `PATCH /admin/tenants/:id/status` (activate/suspend)
- ✅ **Complete:** Atomic provisioning with admin guard
- ⚠️ **Issue:** Provisioning endpoint not registered in routing

---

# 3️⃣ PLANS & SUBSCRIPTIONS (SYSTEM AUTHORITY)

## Required Endpoints

| Method | Endpoint                  | Status | Implementation Path | Notes |
| ------ | ------------------------- | ------ | ------------------- | ----- |
| GET    | `/admin/plans`            | ⚠️ PARTIAL | Hardcoded in `subscriptions.service.ts` | No endpoint, just constants |
| POST   | `/admin/plans`            | ❌ MISSING | N/A | Plans are immutable constants |
| PATCH  | `/admin/tenants/:id/plan` | ⚠️ PARTIAL | `admin/subscriptions.controller.ts::changePlan` | Exists but tenant-scoped |
| GET    | `/admin/subscriptions`    | ❌ MISSING | N/A | No global list |

## Current State

### Plan Definition
**File:** `backend/libs/billing/subscriptions.service.ts`

```typescript
export const PLANS: Record<PlanTier, SubscriptionPlan> = {
  starter: {
    tier: 'starter',
    name: 'Starter Plan',
    priceKobo: 4900000, // ₦49,000
    conversationsLimit: 500,
    overagePriceKobo: 12000,
  },
  growth: {
    tier: 'growth',
    name: 'Growth Plan',
    priceKobo: 19900000, // ₦199,000
    conversationsLimit: 2500,
    overagePriceKobo: 10000,
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise Plan',
    priceKobo: 79900000, // ₦799,000
    conversationsLimit: 12000,
    overagePriceKobo: 8000,
  },
}
```

**Analysis:**
- ✅ Plans are well-defined constants
- ✅ Three tiers with clear pricing
- ❌ **CRITICAL:** Plans are hardcoded, not database-backed
- ❌ Admin cannot create/modify plans
- ❌ No dynamic pricing capability

### Subscription Management
**File:** `backend/apps/admin/subscriptions.controller.ts`

```typescript
@Controller('subscriptions')
export class SubscriptionsController {
  @Post()
  async createSubscription(@Body() body: { tenantId: string; planTier: PlanTier }) {
    // Creates subscription for tenant
  }

  @Put('plan')
  async changePlan(@Body() body: { tenantId: string; newPlanTier: PlanTier }) {
    // Changes plan tier
  }
  
  @Get()
  async getSubscription(@Query('tenantId') tenantId: string) {
    // Gets single tenant subscription
  }
}
```

**Analysis:**
- ✅ Create subscription exists
- ✅ Change plan exists
- ⚠️ **All endpoints require `tenantId`** - No admin override capability
- ❌ No "list all subscriptions" endpoint
- ❌ No admin-initiated plan assignment

### Subscription Schema
**File:** `backend/prisma/schema.prisma`

```prisma
model Subscription {
  id                          String   @id @default(uuid())
  tenant_id                   String   @unique
  plan_tier                   String   // "starter" | "growth" | "enterprise"
  status                      String   // "active" | "cancelled" | "past_due"
  current_period_start        DateTime
  current_period_end          DateTime
  conversations_used          Int      @default(0)
  conversations_limit         Int
  overage_cost_kobo           Int      @default(0)
  paystack_plan_code          String?
  paystack_subscription_code  String?
  
  tenant Tenant @relation(...)
}
```

**Analysis:**
- ✅ Complete subscription model
- ✅ Status field for tracking
- ✅ Usage tracking built-in
- ✅ One-to-one with Tenant

### Audit Questions & Answers

| Question | Answer | Evidence |
| -------- | ------ | -------- |
| Are plans system-owned or tenant-owned? | **SYSTEM-OWNED** - Hardcoded constants | `PLANS` object |
| Can admin override usage caps? | **NO** - No endpoint exists | No implementation found |
| Is plan change reversible? | **YES** - Can call changePlan multiple times | `changePlan` method |
| Is billing recalculated correctly? | **YES** - Service handles recalculation | `subscriptions.service.ts` |

### Gap Summary
- ❌ **Missing:** `GET /admin/plans` endpoint (expose PLANS constant)
- ❌ **Missing:** `POST /admin/plans` (dynamic plan creation)
- ❌ **Missing:** `PATCH /admin/tenants/:id/plan` (admin-initiated assignment)
- ❌ **Missing:** `GET /admin/subscriptions` (list all)
- ⚠️ **Limitation:** Plans are hardcoded, not configurable
- ⚠️ **Issue:** No admin override for usage limits

---

# 4️⃣ BILLING & PAYMENTS (GLOBAL VIEW)

## Required Endpoints

| Method | Endpoint                      | Status | Implementation Path | Notes |
| ------ | ----------------------------- | ------ | ------------------- | ----- |
| GET    | `/admin/payments`             | ❌ MISSING | N/A | No global payment list |
| GET    | `/admin/revenue/summary`      | ❌ MISSING | N/A | No MRR aggregation |
| GET    | `/admin/tenants/:id/payments` | ❌ MISSING | N/A | No per-tenant admin view |

## Current State

### Payment Tracking
**File:** `backend/apps/api/src/payment.controller.ts` (Tenant-facing)

```typescript
@Controller('api/payments')
export class PaymentController {
  @Get('status')
  async getPaymentStatus(@Query('tenantId') tenantId: string) {
    return this.paymentService.getPaymentsByTenant(tenantId)
  }
}
```

**Analysis:**
- ✅ Tenant-scoped payment retrieval exists
- ❌ No admin endpoint for cross-tenant view
- ❌ No revenue aggregation

### Payment Analytics (Internal Reports)
**File:** `backend/apps/api/admin/internal-reports/reports.service.ts`

```typescript
async paymentProcessingVolume() {
  return this.prisma.payment.groupBy({
    by: ['tenant_id'],
    _sum: { amount_kobo: true },
    _count: { id: true },
    where: { status: 'paid' },
  })
}
```

**Controller:** `backend/apps/api/admin/internal-reports/reports.controller.ts`

```typescript
async paymentVolume(req: any, res: any) {
  if (!req.user || req.user.role !== 'admin') 
    return res.status(403).json({ error: 'FORBIDDEN' })
  const data = await this.reportsService.paymentProcessingVolume()
  res.json(data)
}
```

**Analysis:**
- ✅ **Payment volume aggregation exists**
- ✅ **Admin role guard present**
- ✅ Grouped by tenant with sum and count
- ❌ **Not registered as standard admin endpoint**
- ❌ No MRR/ARR calculation
- ❌ No time-based filtering

### Payment Schema
**File:** `backend/prisma/schema.prisma`

```prisma
model Payment {
  id          String   @id @default(uuid())
  tenant_id   String
  order_id    String?
  booking_id  String?
  amount_kobo Int
  status      String
  reference   String   @unique
  provider    String?  // Paystack, Flutterwave
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
}
```

**Analysis:**
- ✅ Complete payment model
- ✅ Multi-provider support
- ✅ Audit trail via timestamps
- ✅ Status tracking

### Audit Questions & Answers

| Question | Answer | Evidence |
| -------- | ------ | -------- |
| Can admin see cross-tenant billing? | **PARTIAL** - Internal report exists but not exposed | `reports.service.ts` |
| Is revenue aggregatable? | **YES** - GroupBy query functional | `paymentProcessingVolume()` |
| Are failed payments visible? | **YES** - Status field tracked | Payment schema |
| Are refunds tracked (even read-only)? | **NO** - No refund model found | N/A |

### Gap Summary
- ❌ **Missing:** `GET /admin/payments` (all payments)
- ❌ **Missing:** `GET /admin/revenue/summary` (MRR/ARR)
- ❌ **Missing:** `GET /admin/tenants/:id/payments` (admin view)
- ⚠️ **Partial:** Payment volume report exists but not standardized
- ❌ **Missing:** Refund tracking
- ❌ **Missing:** Time-based revenue filters

---

# 5️⃣ MESSAGING & AI MONITORING (SYSTEM HEALTH)

## Required Endpoints

| Method | Endpoint                 | Status | Implementation Path | Notes |
| ------ | ------------------------ | ------ | ------------------- | ----- |
| GET    | `/admin/messaging/stats` | ⚠️ PARTIAL | `internal-reports/reports.service.ts::messagingVolumePerChannel` | Exists as report |
| GET    | `/admin/ai/health`       | ❌ MISSING | N/A | No AI health endpoint |
| GET    | `/admin/queues/health`   | ❌ MISSING | N/A | No queue monitoring |

## Current State

### Messaging Volume Tracking
**File:** `backend/apps/api/admin/internal-reports/reports.service.ts`

```typescript
async messagingVolumePerChannel() {
  return this.prisma.message.groupBy({
    by: ['tenant_id', 'sender_type'],
    _count: { id: true },
  })
}
```

**Controller:** Exists with admin guard

**Analysis:**
- ✅ Message counting exists
- ✅ Grouped by tenant and channel
- ⚠️ Not exposed as standard admin endpoint
- ❌ No real-time metrics
- ❌ No failure tracking

### AI Usage Tracking
**File:** `backend/apps/api/admin/internal-reports/reports.service.ts`

```typescript
async aiUsagePerTenant() {
  return this.prisma.auditLog.groupBy({
    by: ['tenant_id'],
    _count: { id: true },
    where: { action: { startsWith: 'AI_INTENT:' } },
  })
}
```

**Analysis:**
- ✅ AI intent tracking via audit logs
- ✅ Per-tenant aggregation
- ❌ No latency metrics
- ❌ No failure rate
- ❌ No worker health status

### Worker Infrastructure
**Files Found:**
- `backend/apps/worker/messaging/ai-message.processor.ts`
- `backend/apps/worker/messaging/retry.worker.ts`

**Analysis:**
- ✅ BullMQ workers exist
- ❌ No health check endpoints
- ❌ No queue depth monitoring
- ❌ No worker status reporting

### Audit Questions & Answers

| Question | Answer | Evidence |
| -------- | ------ | -------- |
| Are worker metrics exposed? | **NO** - No endpoints found | N/A |
| Can failures be detected? | **PARTIAL** - Logged but not aggregated | Audit logs exist |
| Can admin see cross-tenant traffic? | **YES** - Via internal reports | `messagingVolumePerChannel` |
| Is this real data (not logs)? | **YES** - Database queries | GroupBy queries |

### Gap Summary
- ❌ **Missing:** `GET /admin/messaging/stats` (standardized endpoint)
- ❌ **Missing:** `GET /admin/ai/health` (latency, failures)
- ❌ **Missing:** `GET /admin/queues/health` (BullMQ status)
- ⚠️ **Partial:** Message volume available via internal report
- ❌ **Missing:** Real-time worker monitoring
- ❌ **Missing:** Queue depth visibility

---

# 6️⃣ ORDERS & BOOKINGS (GLOBAL OPS)

## Required Endpoints

| Method | Endpoint                      | Status | Implementation Path | Notes |
| ------ | ----------------------------- | ------ | ------------------- | ----- |
| GET    | `/admin/orders`               | ❌ MISSING | N/A | No global list |
| GET    | `/admin/bookings`             | ❌ MISSING | N/A | No global list |
| GET    | `/admin/tenants/:id/orders`   | ⚠️ PARTIAL | `admin/orders.controller.ts::list` | Tenant-scoped only |
| GET    | `/admin/tenants/:id/bookings` | ⚠️ PARTIAL | `admin/bookings.controller.ts::list` | Tenant-scoped only |

## Current State

### Orders Management (Tenant-Scoped)
**File:** `backend/apps/api/admin/orders.controller.ts`

```typescript
async list(req: Request, res: Response) {
  const tenantId = req.user.tenant_id  // ⚠️ From authenticated user
  const orders = await req.services.prisma.order.findMany({
    where: { tenant_id: tenantId },
    include: { orderItems: true },
    orderBy: { created_at: 'desc' },
  })
  res.json(orders)
}
```

**Analysis:**
- ✅ Order listing exists
- ✅ Includes line items
- ⚠️ **CRITICAL:** Uses `req.user.tenant_id` (tenant admin, not super admin)
- ❌ No cross-tenant capability
- ❌ No filtering options

### Bookings Management (Tenant-Scoped)
**File:** `backend/apps/api/admin/bookings.controller.ts`

```typescript
async list(req: Request, res: Response) {
  const tenantId = req.user.tenant_id  // ⚠️ From authenticated user
  const bookings = await req.services.prisma.booking.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
  })
  res.json(bookings)
}
```

**Analysis:**
- ✅ Booking listing exists
- ⚠️ **CRITICAL:** Tenant-scoped only
- ❌ No cross-tenant capability

### Support Tools (Tenant-Aware)
**File:** `backend/apps/api/admin/support/support.controller.ts`

```typescript
async getOrders(req: any, res: any) {
  if (!user || user.role !== 'admin') 
    return res.status(403).json({ error: 'FORBIDDEN' })
  const tenantId = req.query.tenantId as string  // ✅ Takes tenantId as param
  if (!tenantId) return res.status(400).json({ error: 'TENANT_REQUIRED' })
  const data = await this.getOrderTimelineViewer(prisma).view(prisma, tenantId, orderId)
  res.json(data)
}
```

**Analysis:**
- ✅ Admin role guard
- ✅ **Accepts `tenantId` as query param** (better for super admin)
- ✅ Order timeline viewer exists
- ⚠️ Requires specific `orderId` (not a list)

### Audit Questions & Answers

| Question | Answer | Evidence |
| -------- | ------ | -------- |
| Can admin view all transactions? | **NO** - Only tenant-scoped | `req.user.tenant_id` usage |
| Is tenant isolation respected? | **YES** - All queries scoped | Where clauses |
| Are status transitions visible? | **YES** - OrderAudit model exists | Schema |

### Gap Summary
- ❌ **Missing:** `GET /admin/orders` (all orders across tenants)
- ❌ **Missing:** `GET /admin/bookings` (all bookings across tenants)
- ⚠️ **Issue:** Existing endpoints use `req.user.tenant_id` (not super admin friendly)
- ✅ **Good:** Support tools accept `tenantId` as parameter
- ⚠️ **Partial:** Timeline viewers exist but not list endpoints

---

# 7️⃣ SYSTEM CONFIGURATION (CONTROL PLANE)

## Required Endpoints

| Method | Endpoint                 | Status | Implementation Path | Notes |
| ------ | ------------------------ | ------ | ------------------- | ----- |
| GET    | `/admin/system/settings` | ❌ MISSING | N/A | No centralized config |
| PATCH  | `/admin/system/settings` | ❌ MISSING | N/A | No config mutation |
| GET    | `/admin/system/health`   | ⚠️ PARTIAL | `src/health.controller.ts` | Basic health check only |

## Current State

### Health Check
**File:** `backend/apps/api/src/health.controller.ts`

```typescript
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok' }
  }
}
```

**Analysis:**
- ✅ Basic health endpoint exists
- ❌ No database connectivity check
- ❌ No Redis status
- ❌ No worker status
- ❌ No aggregated system health

### Configuration Management
**No centralized configuration endpoint found**

**Files Searched:**
- Feature flags: `backend/libs/config/flag.guard.ts` (feature flag guard exists)
- Enterprise flags: `backend/libs/tenant/enterprise/enterprise.flags.ts` (hardcoded)
- No admin config CRUD

**Analysis:**
- ❌ No system settings endpoint
- ❌ No runtime configuration
- ⚠️ Feature flags exist but are tenant-scoped, not system-wide

### Audit Questions & Answers

| Question | Answer | Evidence |
| -------- | ------ | -------- |
| Are system flags centralized? | **NO** - Feature flags are tenant-scoped | `enterprise.flags.ts` |
| Can admin disable features safely? | **NO** - No endpoint exists | N/A |
| Is health aggregated or partial? | **PARTIAL** - Basic OK response only | `health.controller.ts` |

### Gap Summary
- ❌ **Missing:** `GET /admin/system/settings`
- ❌ **Missing:** `PATCH /admin/system/settings`
- ❌ **Missing:** Comprehensive health aggregation
- ⚠️ **Partial:** Basic health check exists
- ❌ **Missing:** System-wide feature flag management

---

## ROLE GUARDS & ACCESS CONTROL DOCUMENTATION

### Current Implementation

#### Role Values in Use
Based on code analysis:
- `'owner'` - Tenant owner
- `'staff'` - Tenant staff member
- `'admin'` - Admin user (currently tenant-scoped)
- `'customer'` - End customer (blocked from login)

#### Guard Mechanisms

**1. RolesGuard**
**File:** `backend/libs/auth/guards/roles.guard.ts`

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return roles.includes(user.role);
  }
}
```

**Usage:**
- Used in support endpoints: `if (!req.user || req.user.role !== 'admin')`
- Used in internal reports: Same pattern
- Used in onboarding: `if (!req.user || req.user.role !== 'admin')`

**2. JWT Auth Guard**
**File:** `backend/libs/auth/guards/jwt-auth.guard.ts`

```typescript
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

**3. Tenant Middleware**
**File:** `backend/libs/auth/middleware/tenant.middleware.ts`

```typescript
async use(req: Request, res: Response, next: NextFunction) {
  const user = req.user
  if (!user) throw new UnauthorizedException();
  
  if (user.role === 'admin') {
    return next()  // ⚠️ Admin bypass tenant requirement
  }
  
  const tenantId = req.headers['x-tenant-id']
  if (!tenantId) throw new UnauthorizedException('Tenant required');
  // Validate tenant access...
}
```

**Analysis:**
- ✅ Role guards are functional
- ✅ Admin role recognized and respected
- ⚠️ Admin bypass exists but is tenant-scoped admin
- ❌ No SUPER_ADMIN or SYSTEM_ADMIN distinction

### Access Control Matrix (Current State)

| Role | Scope | Can Create Tenants | Can View All Tenants | Can Modify Any Tenant |
| ---- | ----- | ------------------ | -------------------- | --------------------- |
| `owner` | Single tenant | ❌ | ❌ | ❌ |
| `staff` | Single tenant (branch-scoped) | ❌ | ❌ | ❌ |
| `admin` | **Single tenant** ⚠️ | ✅ (via provision) | ❌ | ❌ (own tenant only) |
| **SUPER_ADMIN** | ❌ **NOT IMPLEMENTED** | - | - | - |

### Critical Authorization Issues

1. **No System-Level Admin**
   - All users, including admins, are `tenant_id`-scoped
   - No way to represent cross-tenant authority

2. **Admin Role Ambiguity**
   - `admin` role exists but is tenant-scoped
   - Cannot distinguish tenant admin from super admin

3. **Hardcoded Role Checks**
   - Role guards use string comparison: `user.role !== 'admin'`
   - No role hierarchy or permission system

---

## INVENTORY OF EXISTING ENDPOINTS

### Admin Endpoints Currently Implemented

#### Subscriptions (NestJS Controller)
**File:** `backend/apps/admin/subscriptions.controller.ts`  
**Base Path:** `/subscriptions`

| Method | Path | Tenant-Scoped? | Admin Guard? | Status |
| ------ | ---- | -------------- | ------------ | ------ |
| GET | `/subscriptions?tenantId=xxx` | ✅ | ❌ | Tenant-facing |
| GET | `/subscriptions/usage?tenantId=xxx` | ✅ | ❌ | Tenant-facing |
| GET | `/subscriptions/bill?tenantId=xxx` | ✅ | ❌ | Tenant-facing |
| POST | `/subscriptions` | ✅ | ❌ | Tenant-facing |
| PUT | `/subscriptions/plan` | ✅ | ❌ | Tenant-facing |
| DELETE | `/subscriptions?tenantId=xxx` | ✅ | ❌ | Tenant-facing |

#### Branding (NestJS Controller)
**File:** `backend/apps/admin/branding.controller.ts`  
**Base Path:** `/tenant/branding`

| Method | Path | Tenant-Scoped? | Admin Guard? | Status |
| ------ | ---- | -------------- | ------------ | ------ |
| GET | `/tenant/branding?tenantId=xxx` | ✅ | ❌ | Tenant-facing |
| POST | `/tenant/branding` | ✅ | ❌ | Tenant-facing |

#### Onboarding (Express-style)
**File:** `backend/apps/api/admin/onboarding/onboarding.controller.ts`  
**Route:** NOT REGISTERED ⚠️

| Method | Path | Tenant-Scoped? | Admin Guard? | Status |
| ------ | ---- | -------------- | ------------ | ------ |
| POST | `/admin/tenants/provision` | ❌ | ✅ | Admin-only, not routed |

#### Support Tools (Express-style)
**File:** `backend/apps/api/admin/support/support.controller.ts`  
**Routes:** `backend/apps/api/admin/support/support.routes.ts`

| Method | Path | Tenant-Scoped? | Admin Guard? | Status |
| ------ | ---- | -------------- | ------------ | ------ |
| GET | `/admin/support/conversations` | ⚠️ Requires tenantId param | ✅ | Registered |
| GET | `/admin/support/orders` | ⚠️ Requires tenantId param | ✅ | Registered |
| GET | `/admin/support/bookings` | ⚠️ Requires tenantId param | ✅ | Registered |

#### Internal Reports (Express-style)
**File:** `backend/apps/api/admin/internal-reports/reports.controller.ts`  
**Route:** NOT REGISTERED ⚠️

| Method | Path | Tenant-Scoped? | Admin Guard? | Status |
| ------ | ---- | -------------- | ------------ | ------ |
| GET | `/admin/reports/ai-usage` | ❌ | ✅ | Not routed |
| GET | `/admin/reports/messaging` | ❌ | ✅ | Not routed |
| GET | `/admin/reports/payments` | ❌ | ✅ | Not routed |

#### Analytics (Express-style)
**File:** `backend/apps/api/admin/analytics.controller.ts`  
**Route:** NOT REGISTERED ⚠️

| Method | Path | Tenant-Scoped? | Admin Guard? | Status |
| ------ | ---- | -------------- | ------------ | ------ |
| GET | `/admin/analytics/summary` | ✅ (uses req.user.tenant_id) | ⚠️ Implicit | Not routed |

---

## MISSING ENDPOINTS SUMMARY

### Critical (Phase A1 Blockers)

1. **`POST /admin/auth/login`**
   - Purpose: Super admin authentication
   - Required for: Admin Console login
   - Impact: Cannot authenticate as system admin

2. **`GET /admin/tenants`**
   - Purpose: List all tenants
   - Required for: Tenant management UI
   - Impact: Cannot see tenant roster

3. **`PATCH /admin/tenants/:id/status`**
   - Purpose: Activate/suspend tenants
   - Required for: Tenant lifecycle management
   - Impact: Cannot control tenant status

4. **`GET /admin/subscriptions`**
   - Purpose: List all subscriptions
   - Required for: Billing overview
   - Impact: Cannot see subscription landscape

5. **`GET /admin/payments`**
   - Purpose: List all payments
   - Required for: Revenue tracking
   - Impact: Cannot monitor financial health

### High Priority (Needed for full admin experience)

6. **`GET /admin/revenue/summary`**
   - Purpose: MRR/ARR aggregation
   - Impact: No financial KPIs

7. **`GET /admin/plans`**
   - Purpose: List available plans
   - Impact: Plans are invisible to admin UI

8. **`GET /admin/messaging/stats`**
   - Purpose: Message volume metrics
   - Impact: No operational visibility

9. **`GET /admin/ai/health`**
   - Purpose: AI worker health
   - Impact: Cannot detect AI failures

10. **`GET /admin/queues/health`**
    - Purpose: BullMQ queue status
    - Impact: No worker monitoring

11. **`GET /admin/orders`**
    - Purpose: Cross-tenant order list
    - Impact: Cannot see order activity

12. **`GET /admin/bookings`**
    - Purpose: Cross-tenant booking list
    - Impact: Cannot see booking activity

### Medium Priority (Nice to have)

13. **`GET /admin/system/settings`**
    - Purpose: View system configuration
    - Impact: No config visibility

14. **`PATCH /admin/system/settings`**
    - Purpose: Update system config
    - Impact: Cannot adjust settings

15. **`POST /admin/plans`**
    - Purpose: Create/modify plans
    - Impact: Plans remain hardcoded

---

## REQUIRED DATA CONTRACTS

### Admin Identity Response
```typescript
// GET /admin/auth/me
{
  id: string
  email: string
  role: 'SUPER_ADMIN'  // Not 'admin'
  scope: 'SYSTEM'      // Not tenant-scoped
  permissions: string[] // Optional: ['tenants:read', 'tenants:write', ...]
}
```

### Tenant List Response
```typescript
// GET /admin/tenants
{
  tenants: [
    {
      id: string
      name: string
      status: 'active' | 'suspended' | 'trial'
      subscription: {
        plan_tier: string
        status: string
        conversations_used: number
        conversations_limit: number
      }
      created_at: string
      suspended: boolean
    }
  ],
  total: number
  page: number
  pageSize: number
}
```

### Revenue Summary Response
```typescript
// GET /admin/revenue/summary
{
  mrr: number         // Monthly Recurring Revenue in kobo
  arr: number         // Annual Recurring Revenue in kobo
  activeSubscriptions: number
  churn: number       // Percentage
  averageRevenuePerTenant: number
  period: {
    start: string
    end: string
  }
}
```

### System Health Response
```typescript
// GET /admin/system/health
{
  status: 'healthy' | 'degraded' | 'down'
  components: {
    database: { status: 'up' | 'down', latency_ms: number }
    redis: { status: 'up' | 'down', latency_ms: number }
    queues: {
      'ai-messages': { depth: number, processing_rate: number }
      'outbound-messages': { depth: number, processing_rate: number }
    }
    workers: {
      'ai-processor': { status: 'running' | 'stopped', jobs_completed: number }
      'message-retry': { status: 'running' | 'stopped', jobs_completed: number }
    }
  }
  timestamp: string
}
```

---

## ANSWERS TO KEY AUTHORITY QUESTIONS

### Who can create tenants?
**Current:** User with `role: 'admin'` can call provision endpoint  
**Problem:** Admin users are tenant-scoped (have `tenant_id`)  
**Required:** System-level SUPER_ADMIN with no tenant affiliation

### Who assigns plans?
**Current:** Tenant can change own plan via subscription controller  
**Problem:** No admin override capability  
**Required:** Admin endpoint to assign any plan to any tenant

### Who sees revenue?
**Current:** Internal report exists but not exposed as admin endpoint  
**Problem:** No one can access it via API  
**Required:** Admin revenue summary endpoint

### Who controls the system?
**Current:** No one - no system-level admin exists  
**Problem:** Cannot perform cross-tenant operations  
**Required:** SUPER_ADMIN role with SYSTEM scope

---

## PHASE A1 COMPLETION CHECKLIST

### ✅ Inventory Complete
- [x] All existing endpoints documented
- [x] All admin controllers identified
- [x] All role guards catalogued

### ✅ Gaps Identified
- [x] Missing endpoints listed (15 endpoints)
- [x] Authentication gaps documented
- [x] Authorization limitations clear

### ✅ Authority Model Documented
- [x] Current role system analyzed
- [x] Super admin requirement identified
- [x] Access control matrix created

### ✅ Data Contracts Defined
- [x] Admin identity contract specified
- [x] Tenant list contract defined
- [x] Revenue summary contract designed
- [x] System health contract outlined

### ⚠️ Ambiguities Resolved
- [x] Admin role scope clarified (tenant-scoped, not system-level)
- [x] Provisioning capability confirmed (exists but not routed)
- [x] Revenue tracking verified (internal report exists)
- [x] Worker monitoring status confirmed (not implemented)

---

## RECOMMENDATION FOR PHASE A2

### Before Proceeding to UI

**CRITICAL PREREQUISITES:**

1. **Introduce SUPER_ADMIN Identity Model**
   - Create system-level admin user (no `tenant_id`)
   - Add `scope: 'SYSTEM' | 'TENANT'` to User model
   - Seed initial super admin during bootstrap

2. **Create Admin Authentication Flow**
   - Implement `POST /admin/auth/login`
   - Implement `POST /admin/auth/logout`
   - Implement `GET /admin/auth/me`

3. **Implement Critical Admin Endpoints** (Priority Order)
   - `GET /admin/tenants` - List all tenants
   - `GET /admin/tenants/:id` - Get tenant details
   - `PATCH /admin/tenants/:id/status` - Activate/suspend
   - `GET /admin/subscriptions` - List all subscriptions
   - `GET /admin/payments` - List all payments
   - `GET /admin/revenue/summary` - MRR/ARR

4. **Register Existing Admin Routes**
   - Wire up onboarding controller
   - Wire up internal reports controller
   - Standardize endpoint paths

5. **Document API Contract**
   - Generate OpenAPI/Swagger spec for admin endpoints
   - Define error response formats
   - Document pagination standards

### Do NOT Proceed Until:
- [ ] SUPER_ADMIN role exists in database
- [ ] At least one seeded super admin user exists
- [ ] Admin authentication endpoints are functional
- [ ] `GET /admin/tenants` returns data
- [ ] Admin role guards distinguish SUPER_ADMIN from tenant admin

---

## CONCLUSION

### Phase A1 Status: ✅ AUDIT COMPLETE

This backend has **substantial admin infrastructure** already implemented:
- ✅ Atomic tenant provisioning
- ✅ Subscription management
- ✅ Role-based access control
- ✅ Payment tracking
- ✅ Suspension/activation logic
- ✅ Internal reporting capabilities

**However, critical gaps prevent Admin Console implementation:**
- ❌ No system-level admin identity
- ❌ No admin authentication flow
- ❌ No cross-tenant visibility endpoints
- ❌ Many admin features exist but are not exposed as endpoints

**Recommendation:** Implement identified prerequisites in Phase A2 before proceeding to UI development.

---

**Report Generated:** February 1, 2026  
**Auditor:** GitHub Copilot  
**Phase:** A1 - Backend Readiness Audit  
**Next Phase:** A2 - Admin Backend Implementation

