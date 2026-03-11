# Tenant Onboarding Plan — Raven Enterprise Bot

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
