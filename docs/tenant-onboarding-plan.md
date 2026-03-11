# Tenant Onboarding Plan — Raven Enterprise Bot

**Last Updated:** 2026-03-11  
**Live Platform:** https://app.raven-ai.online

---

## Philosophy

Tenants sign themselves up. The admin console exists for internal operations (support, suspension, billing oversight) — it is not the primary provisioning path. The platform should sell itself: a clean self-service registration flow, instant email confirmation, a guided onboarding wizard, and a persistent beginners guide that walks tenants from zero to a live WhatsApp AI assistant with no external help needed.

---

## Full Onboarding Flow

```
Register → Email confirmation → Onboarding wizard (profile + WhatsApp keys)
         → Dashboard → First-time tour → Beginners guide checklist
```

---

## Stage 1 — Registration

**Page:** `https://app.raven-ai.online/register`  
**Route:** `dashboard/app/register/page.tsx`  
**Backend:** `POST /api/auth/register`

### Step 1.1 — Account details
The registration page is a two-step form (no page reload between steps).

**Step 1 collects:**
- Full name
- Email address
- Password (min 8 chars, confirm field, show/hide toggle)

Clicking **Continue** validates client-side and advances to Step 2.

**Step 2 — Plan selection:**
Three plan cards are shown: Starter (₦49k), Growth (₦199k), Enterprise (₦799k). Clicking a card selects it. **Create account** submits.

### What happens on submit
1. `POST /api/auth/register` receives `{ name, email, password, planTier }`.
2. Checks email uniqueness in the `User` table.
3. Checks for any still-in-flight pending registration for the same email.
4. Generates a 32-byte random hex confirmation token.
5. Stores `{ name, email, password, planTier, expiresAt: +24h }` as a `SystemConfig` entry with key `PENDING_REG_<token>` and `is_secret: true`. **No tenant is created yet.**
6. Sends a branded confirmation email to the user with a link to `https://app.raven-ai.online/confirm-email?token=<token>`.
7. Redirects the browser to `/register/check-email?email=<email>`.

**Error responses:**
- `409 Conflict` — email already registered
- `400 Bad Request` — missing fields or password too short

---

## Stage 2 — Email Confirmation

**Page:** `https://app.raven-ai.online/confirm-email?token=...`  
**Route:** `dashboard/app/confirm-email/page.tsx`  
**Backend:** `GET /api/auth/confirm-email?token=...`

When the user clicks the link in their email:
1. The page immediately calls `GET /api/auth/confirm-email?token=<token>`.
2. Backend validates the token (exists, not expired).
3. **Atomically provisions** the tenant:
   - Creates `Tenant` record
   - Creates owner `User` (role: `owner`)
   - Creates temp staff user
   - Creates default Branch, seed MenuCategory, MenuItem, RoomType
4. Creates a `Subscription` for the chosen plan tier.
5. Sets `onboardingStep: 'profile'` in the tenant's `theme` JSON.
6. Deletes the `PENDING_REG_<token>` SystemConfig entry (consumed, one-time use).
7. Issues a JWT and returns it.
8. Sends a "You're in!" welcome email.
9. Saves the JWT session to `localStorage` and redirects to `/onboarding`.

**Error states shown on the page:**
- No token in URL → error state
- Token not found or expired → error state with link to `/register`

---

## Stage 3 — Onboarding Wizard

**Page:** `https://app.raven-ai.online/onboarding`  
**Route:** `dashboard/app/onboarding/page.tsx`

A 4-step wizard (`Welcome → Profile → WhatsApp & AI → Done`) shown in a full-screen layout (no sidebar/header). Progress is shown by a numbered step bar.

### Step 1 — Welcome
- Explains the 3-minute setup in plain language.
- Three visual cards: Business profile / WhatsApp & AI / Go live.
- Single CTA: **Let's set up your profile →**

### Step 2 — Business profile (3 field groups)

| Group | Fields |
|-------|--------|
| **Identity** | Business name *, Industry (dropdown), Logo URL |
| **Contact** | WhatsApp number *, Website |
| **Brand colour** | Color picker + hex input |

\* Required. Saves via `POST /tenant/branding`.

### Step 3 — WhatsApp & AI keys

| Field | Source | Required |
|-------|--------|----------|
| Meta App Secret | App Settings → Basic | ✅ |
| Webhook Verify Token | User-defined (pre-filled with a suggestion) | ✅ |
| Meta Access Token | System User → Generate token | ✅ |
| Phone Number ID | WhatsApp → API Setup | ✅ |
| OpenAI API Key | platform.openai.com | Optional |

An amber info box shows the webhook URL to paste into Meta:
`https://app.raven-ai.online/api/messaging/webhook/whatsapp`

A **Skip for now** link lets users proceed without AI keys (they can add them later in Settings).

### Step 4 — Done
- Celebratory screen with four benefit tiles.
- Single CTA: **Go to dashboard →** (navigates to `/overview`).

---

## Stage 4 — First-time Dashboard Tour

**Component:** `dashboard/components/DashboardTour.tsx`

On the first visit to `/overview` after a new login:
1. A dimmed backdrop appears over the dashboard.
2. A floating card anchored next to the sidebar walks through 8 stops:

| Stop | Section | What it explains |
|------|---------|-----------------|
| 1 | Overview | KPI tiles, live conversation feed |
| 2 | Conversations | All WhatsApp chats, read/reply/escalate |
| 3 | Orders | Status pipeline: pending → confirmed → ready → delivered |
| 4 | Menu / Catalogue | Products the AI uses to answer and take orders |
| 5 | Customers | Full contact history and conversation threads |
| 6 | Broadcast | One-to-many messaging campaigns |
| 7 | Analytics | Volume, intents, peak hours |
| 8 | Settings | Branding, WhatsApp number, API keys |

Progress bar across the top of the card. **Back / Next** navigation. **Skip tour** at the bottom. Once dismissed (or completed), the flag is stored in `localStorage` under `dashboard_tour_seen` and the tour never shows again.

---

## Stage 5 — Beginners Guide (Onboarding Checklist)

**Component:** `dashboard/components/OnboardingChecklist.tsx`  
**Location:** Shown above page content on the `/overview` page until all 5 steps are marked complete.

A collapsible card with a circular progress ring and 5 trackable steps:

| # | Step | Action link |
|---|------|------------|
| 1 | ✅ Connect WhatsApp | → /settings |
| 2 | ✅ Set up your catalogue | → /menu |
| 3 | ✅ Configure FAQs | → /settings |
| 4 | ✅ Send your first message | → /conversations |
| 5 | ✅ Test the ordering flow | → /orders |

Each step can be manually checked off (ticking the circle) or auto-marked when the action link is visited. Clicking an action link marks the step complete AND navigates to it. Completion state is persisted in `localStorage` under `onboarding_checklist`. Once all 5 are complete, the card collapses into a success badge that can be dismissed.

---

## Admin Operations (Internal Only)

The Admin Console at `https://admin.raven-ai.online` is used for:
- Viewing all tenant accounts and their subscription status
- Manually suspending / unsuspending tenants (non-payment, abuse)
- Changing a tenant's plan tier
- Entering global platform keys (Paystack, SMTP, etc.)
- Investigating billing issues

Admin-created tenants (via the console) should only be used for internal test accounts or enterprise contracts negotiated off-platform.

---

## Email Templates

| Trigger | Subject | Content |
|---------|---------|---------|
| Registration | "Confirm your Raven account" | Name, confirm link, 24h expiry warning |
| Email confirmed | "🎉 Your Raven account is ready!" | Plan name, onboarding link, login email |

Both emails are sent via `EmailService` (nodemailer). SMTP is configured in Admin Console → API Keys → Email/SMTP. Until SMTP is configured, emails use Ethereal (test/preview only).

---

## Quick-Start Checklist

### For the platform operator (before launch)
- [ ] SMTP keys configured in Admin Console → API Keys → Email
- [ ] Paystack keys configured (so subscription payments work)
- [ ] `NEXT_PUBLIC_DASHBOARD_URL` set to `https://app.raven-ai.online`
- [ ] Confirm `/register` page loads on the live domain
- [ ] Confirm confirmation email is received after test registration
- [ ] Confirm `/confirm-email?token=...` creates tenant and redirects to `/onboarding`

### What the tenant does (entirely self-service)
- [ ] Visit `https://app.raven-ai.online` and click **Get started free**
- [ ] Fill in name, email, password — select plan — click **Create account**
- [ ] Check email → click confirmation link
- [ ] Onboarding wizard: enter business name, WhatsApp number, brand colour
- [ ] Onboarding wizard: enter Meta API keys and OpenAI key (or skip)
- [ ] First-time tour: understand each dashboard section
- [ ] Beginners guide: complete all 5 steps to go fully live

---

## Technical Reference

### New routes added
| Route | File | Public? |
|-------|------|---------|
| `GET /register` | `dashboard/app/register/page.tsx` | ✅ Yes |
| `GET /register/check-email` | `dashboard/app/register/check-email/page.tsx` | ✅ Yes |
| `GET /confirm-email` | `dashboard/app/confirm-email/page.tsx` | ✅ Yes |
| `GET /onboarding` | `dashboard/app/onboarding/page.tsx` | ✅ Yes |

### New API endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | None | Submit registration; sends confirmation email |
| `GET` | `/api/auth/confirm-email?token=` | None | Validate token, provision tenant, return JWT |

### Key components
| Component | File | Purpose |
|-----------|------|---------|
| `DashboardTour` | `dashboard/components/DashboardTour.tsx` | First-login tour overlay |
| `OnboardingChecklist` | `dashboard/components/OnboardingChecklist.tsx` | Persistent 5-step beginners guide |

### Auth flow summary
```
Register form → POST /api/auth/register
             → Email with token link
             → GET /api/auth/confirm-email?token=
             → Tenant provisioned → JWT issued
             → setSession() in localStorage
             → Redirect to /onboarding
             → Onboarding complete → Redirect to /overview
             → DashboardTour shown once
             → OnboardingChecklist persists until all 5 done
```


**Audience:** Platform administrators and new tenant business owners  
**Last Updated:** 2026-03-11  
**Live Platform:** https://app.raven-ai.online (tenant dashboard) | https://admin.raven-ai.online (admin console)

---

## Overview

The full onboarding path from zero to a live AI-powered WhatsApp assistant has five stages:

| Stage | Who Does It | Where |
|-------|-------------|-------|
| 1. Tenant Registration | Super Admin | Admin Console |
| 2. Membership Activation | Super Admin | Admin Console |
| 3. WhatsApp Setup | Tenant Owner | Admin Console → Meta Dev Portal |
| 4. Ordering System | Tenant Owner | Tenant Dashboard |
| 5. Bot Catalogue & FAQs | Tenant Owner | Tenant Dashboard |

---

## Stage 1 — Tenant Registration

### Who does this
The **Super Admin** (`admin@raven.ai`) at https://admin.raven-ai.online.

### What happens automatically
When a tenant is created, the backend runs a **single atomic transaction** (all-or-nothing) that creates:
1. A `Tenant` record
2. An **owner** user (role: `owner`)
3. A **staff** user (role: `staff`) — auto-generated if not supplied
4. A default **Branch** (`Default`)
5. A seed **Menu Category** and **Menu Item**
6. A seed **Room Type**
7. A **Subscription** record on the selected plan

### Steps

**Option A — Admin Console UI**

1. Log into https://admin.raven-ai.online with `admin@raven.ai`
2. Go to **Tenants → New Tenant** (`/admin/tenants/new`)
3. Fill in:
   - **Business Name** — e.g., `Acme Restaurant`
   - **Plan Tier** — `Starter`, `Growth`, or `Enterprise`
   - **Owner Email** — e.g., `owner@acme.ng`
   - **Owner Password** — minimum 8 characters
   - **Staff Email** (optional) — leave blank to auto-generate
4. Click **Create Tenant**
5. Copy the returned **Tenant ID** — you will need it for the API keys setup

**Option B — API (for automated provisioning)**

```http
POST https://admin.raven-ai.online/api/admin/tenants
Authorization: Bearer <super-admin-jwt>
Content-Type: application/json

{
  "tenantName": "Acme Restaurant",
  "planTier": "starter",
  "owner": {
    "email": "owner@acme.ng",
    "password": "SecurePass123!"
  }
}
```

**Successful response includes:**
```json
{
  "tenant": { "id": "cuid-here", "name": "Acme Restaurant" },
  "owner":  { "id": "...", "email": "owner@acme.ng", "role": "owner" },
  "subscription": { "plan_tier": "starter", "status": "active" }
}
```

### Plan Tiers at a Glance

| Plan | Price | Conversations/Month | Use Case |
|------|-------|---------------------|----------|
| **Starter** | ₦49,000/mo | Limited | Small businesses, single branch |
| **Growth** | ₦199,000/mo | Extended | Multi-branch, high volume |
| **Enterprise** | ₦799,000/mo | Unlimited + white-label | Large orgs, resellers |

---

## Stage 2 — Membership Activation

### Subscription lifecycle
After creation the subscription is set to `active` immediately. The 30-day billing cycle begins at provisioning time. The `BillingLifecycleService` tracks conversation usage and applies overage charges at the rate stored in the plan.

### Manually adjust a subscription (Admin Console)

1. Go to **Tenants → [Select Tenant] → Subscription**
2. Use **Change Plan** to upgrade or downgrade
3. Use **Suspend** / **Unsuspend** to toggle access (e.g., for non-payment)

**API equivalents:**
```http
# Assign / change plan
POST /api/admin/subscriptions/tenants/:tenantId/assign-plan
{ "planTier": "growth" }

# Suspend tenant
PATCH /api/admin/tenants/:tenantId/status
{ "status": "suspended", "reason": "Non-payment" }
```

### Tenant self-payment (Paystack)
When a tenant pays via the dashboard, the flow is:

1. Dashboard calls `POST /api/payments/initialize` → returns Paystack checkout URL
2. Customer completes payment on Paystack
3. Paystack fires `POST /api/payments/webhook/paystack` with `charge.success` event
4. Backend verifies the signature, marks subscription as paid, resets billing cycle

> **Note:** Paystack keys (`PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`) must be set in **Admin Console → API Keys → Payment** before this flow can work.

---

## Stage 3 — WhatsApp Setup

This is the most technically involved step. It requires access to a **Meta Business Account** with the WhatsApp Business API product enabled.

### 3.1 — Prerequisites (on Meta's side)

1. Create a **Meta Business Account** at https://business.facebook.com
2. In Meta for Developers (https://developers.facebook.com), create a new **App** (type: Business)
3. Add the **WhatsApp** product to the app
4. Under **WhatsApp → API Setup**, note down:
   - `App Secret` (from App Settings → Basic)
   - `Phone Number ID`
   - `Permanent Access Token` (generate under System Users in Business Settings)
5. Choose a **Webhook Verify Token** — any alphanumeric string you create (e.g., `raven-acme-2026`)

### 3.2 — Enter keys in the Admin Console

1. Log in to https://admin.raven-ai.online
2. Go to **API Keys** (`/admin/api-keys`)
3. Under the **WhatsApp / Meta API** group, fill in:
   | Key | Value |
   |-----|-------|
   | `META_APP_SECRET` | From Meta App Settings → Basic |
   | `META_WEBHOOK_VERIFY_TOKEN` | Your chosen verify token |
   | `META_ACCESS_TOKEN` | Permanent access token |
   | `META_PHONE_NUMBER_ID` | From WhatsApp API Setup |
4. Click **Save** on each field

### 3.3 — Register the webhook in Meta Developer Console

1. In Meta for Developers → Your App → WhatsApp → Configuration
2. Set **Webhook URL** to:
   ```
   https://app.raven-ai.online/api/messaging/webhook/whatsapp
   ```
3. Set **Verify Token** to the exact value you entered as `META_WEBHOOK_VERIFY_TOKEN`
4. Click **Verify and Save**
   - Meta will call `GET /api/messaging/webhook/verify?hub.mode=subscribe&hub.challenge=...&hub.verify_token=<your-token>`
   - The backend will respond `200` with the challenge if the token matches
5. Subscribe to the **`messages`** field (under Webhook Fields)

### 3.4 — Set the WhatsApp number in Branding

1. Log in to https://app.raven-ai.online as the tenant owner
2. Go to **Settings** (`/settings`)
3. Enter the **WhatsApp Number** in international format — e.g., `+2348012345678`
4. Save

This links the incoming webhook messages to the correct tenant when the phone number matches the registered `META_PHONE_NUMBER_ID`.

### 3.5 — Test the connection

Send a message from a WhatsApp account to your registered business number. Within seconds the message should appear in the dashboard under **Conversations**. If the AI key is configured (see Stage 5), the bot will auto-reply.

---

## Stage 4 — Ordering System

The ordering system lets customers browse a menu and place orders through WhatsApp. The AI responds to intents like `MenuBrowse`, `PriceInquiry`, and `OrderDraft`.

### 4.1 — Create Menu Categories

**Dashboard UI:**  
1. Log in to https://app.raven-ai.online as owner
2. Go to **Menu** (`/menu`)
3. Click **Add Category** — e.g., `Starters`, `Main Course`, `Drinks`

**API:**
```http
POST /api/ordering/menu/categories
Authorization: Bearer <tenant-jwt>
{ "name": "Main Course" }
```

### 4.2 — Add Menu Items

**Dashboard UI:**  
1. Inside a category, click **Add Item**
2. Fill in: Name, Description, Price (in kobo — ₦1,500 = `150000`), Availability toggle

**API:**
```http
POST /api/ordering/menu/items
Authorization: Bearer <tenant-jwt>
{
  "categoryId": "cat-cuid",
  "name": "Jollof Rice",
  "description": "Served with chicken and salad",
  "priceKobo": 150000,
  "available": true
}
```

### 4.3 — Manage Orders

- Active orders appear in the **Orders** page (`/orders`)
- Staff can change order status: `pending → confirmed → ready → delivered`
- Customers are notified via WhatsApp when status changes

### 4.4 — How customers order via WhatsApp

The AI handles the full ordering flow automatically:

```
Customer: "What's on the menu?"
Bot:      Lists categories and items with prices

Customer: "I want Jollof Rice"
Bot:      Confirms item, asks for quantity

Customer: "2 please"
Bot:      Creates draft order, shows summary, asks for confirmation

Customer: "Yes"
Bot:      Submits order → Staff sees it in dashboard
```

---

## Stage 5 — Bot Catalogue & FAQs

### 5.1 — Enable the AI

1. In Admin Console → **API Keys** → OpenAI section
2. Enter your `OPENAI_API_KEY`
3. Save

Without an OpenAI key the bot falls back to rule-based responses only.

### 5.2 — Bot Intent Catalogue

The AI classifies every incoming message into one of 13 intents and routes accordingly:

| Intent | Trigger Example | Bot Behaviour |
|--------|----------------|---------------|
| `Greeting` | "Hi", "Hello" | Welcome message with business name |
| `HelpRequest` | "What can you do?" | Lists available capabilities |
| `MenuBrowse` | "Show me the menu" | Lists categories → items |
| `PriceInquiry` | "How much is the burger?" | Returns item price |
| `AvailabilityInquiry` | "Is the suite available?" | Checks room/booking availability |
| `OrderDraft` | "I'd like to order…" | Starts order flow |
| `ModifyOrderDraft` | "Change the quantity" | Updates open draft |
| `BookingRequest` | "Book a room for Friday" | Starts booking flow |
| `PaymentStatusInquiry` | "Did my payment go through?" | Returns payment status |
| `PolicyQuestion` | "What's your return policy?" | Serves FAQ answer |
| `EscalationRequest` | "I need a human" | Flags conversation for staff |
| `GeneralInfo` | "What are your hours?" | Returns from SystemConfig |
| `Fallback` | Anything unrecognised | Polite "I didn't understand" |

The AI uses a **7-state FSM** to track conversation state:

```
Idle → CollectingInfo → DraftCreated → AwaitingBackendValidation
     → Validated → RequiresStaffAction → Closed
```

### 5.3 — Conversation State Machine

| State | What it means |
|-------|---------------|
| `Idle` | No active flow — bot answers general questions |
| `CollectingInfo` | Gathering details for an order or booking |
| `DraftCreated` | Order/booking draft ready, awaiting confirmation |
| `AwaitingBackendValidation` | Backend is checking availability / payment |
| `Validated` | All checks passed, proceeding |
| `RequiresStaffAction` | Escalated — staff must intervene |
| `Closed` | Flow complete |

### 5.4 — Branding the Bot

Set a custom bot persona in **Settings → Branding**:

| Field | Effect |
|-------|--------|
| **Business Name** | Bot greets with "Welcome to [Business Name]!" |
| **Primary Color** | Dashboard UI accent color |
| **Logo URL** | Displayed in dashboard header |
| **WhatsApp Number** | Routes incoming messages to this tenant |

**API:**
```http
POST /api/tenant/branding
Authorization: Bearer <tenant-jwt>
{
  "name": "Acme Restaurant",
  "logoUrl": "https://cdn.acme.ng/logo.png",
  "primaryColor": "#e85d04",
  "whatsappNumber": "+2348012345678"
}
```

### 5.5 — FAQs

FAQs are served by the `PolicyQuestion` intent. The AI draws from:

1. **System prompts** — managed via `SystemConfig` table entries (set by admin)
2. **Bot fallback text** — defined in `libs/ai-engine/prompts.ts` (`FALLBACK_TEXT`)
3. **General business info** — stored in branding/theme JSON

To add custom FAQs for a tenant, create `SystemConfig` entries:

```http
POST /api/admin/config
Authorization: Bearer <super-admin-jwt>
{
  "key": "FAQ_RETURN_POLICY",
  "value": "We accept returns within 7 days of purchase with receipt.",
  "group": "faq"
}
```

> **Roadmap:** A self-service FAQ editor in the tenant dashboard is planned for a future release.

### 5.6 — Booking System (if applicable)

For hospitality/service tenants, rooms and appointments can be booked via WhatsApp using the `BookingRequest` intent.

**Setup:**
1. Go to **Bookings** in the dashboard
2. Add **Room Types** (e.g., Standard, Deluxe Suite) with capacity and price
3. Set availability windows

**API:**
```http
POST /api/booking/room-types
Authorization: Bearer <tenant-jwt>
{
  "name": "Deluxe Suite",
  "capacity": 2,
  "pricePerNightKobo": 5000000
}
```

---

## Quick-Start Checklist

Use this as a handoff checklist when onboarding a new tenant:

### Admin (Super Admin does this)
- [ ] Create tenant in Admin Console with correct plan tier
- [ ] Note the Tenant ID and owner credentials — share securely
- [ ] Confirm subscription is `active`
- [ ] Enter `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID` in API Keys
- [ ] Enter `OPENAI_API_KEY` in API Keys (required for AI bot)
- [ ] Enter `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` if payments are needed

### Tenant Owner (does this after receiving credentials)
- [ ] Log in to https://app.raven-ai.online with provided owner email + password
- [ ] Go to **Settings** and set business name, logo, WhatsApp number, brand color
- [ ] Go to **Menu** and add at least one category and item
- [ ] Register the webhook URL in Meta Developer Console (Stage 3.3)
- [ ] Send a test WhatsApp message to verify the bot responds
- [ ] Add staff members if needed
- [ ] Review the **Conversations** page to confirm message routing works

---

## Credentials & Access Summary

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Admin Console | https://admin.raven-ai.online | `admin@raven.ai` / `SuperAdmin123!` |
| Tenant Dashboard | https://app.raven-ai.online | Owner email set at provisioning |
| API Base URL | https://app.raven-ai.online/api | JWT via `POST /api/auth/login` |

### Tenant API Login
```http
POST https://app.raven-ai.online/api/auth/login
Content-Type: application/json

{
  "email": "owner@acme.ng",
  "password": "SecurePass123!"
}
```

### Response
```json
{
  "access_token": "eyJhbGci...",
  "user": {
    "id": "...",
    "email": "owner@acme.ng",
    "role": "owner",
    "tenant_id": "cuid-here"
  }
}
```

Use `Authorization: Bearer <access_token>` on all subsequent tenant API calls.

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Bot not responding to WhatsApp messages | `META_ACCESS_TOKEN` not set or expired | Re-enter in Admin Console → API Keys |
| Webhook verification fails (403) | `META_WEBHOOK_VERIFY_TOKEN` mismatch | Ensure Meta portal and API Keys settings match exactly |
| AI replies "I'm unable to process that" | `OPENAI_API_KEY` missing | Add key in Admin Console → API Keys |
| Payment link not working | Paystack keys not configured | Add `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` |
| Tenant can't log in | Wrong email or suspended subscription | Check tenant status in Admin Console |
| Messages not routing to correct tenant | `whatsappNumber` not set in branding | Set number in Tenant Dashboard → Settings |
