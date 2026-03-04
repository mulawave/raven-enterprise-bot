# SaaS Pricing Strategy — Raven Enterprise Bot

**Document Version:** 1.0  
**Last Updated:** January 31, 2026  
**Author:** Product Engineering Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Real System Cost Analysis](#real-system-cost-analysis)
3. [Pricing Tiers](#pricing-tiers)
4. [Resource Limits & Scaling](#resource-limits--scaling)
5. [Payment Integration](#payment-integration)
6. [Billing Implementation Roadmap](#billing-implementation-roadmap)

---

## Executive Summary

Raven Enterprise Bot is a multi-tenant WhatsApp/Instagram/Facebook chatbot platform with AI-powered conversation handling, ordering, booking, and payment processing. This document defines our **3-tier subscription model** based on actual infrastructure costs and customer segment needs.

**Pricing Philosophy:**
- **Cost-Plus Model:** Real infrastructure costs + 3.5x markup for sustainable growth
- **Per-Conversation Pricing:** Fair usage-based billing (not per-seat or flat rate)
- **Transparent Limits:** Clear monthly conversation caps with overage pricing
- **Zero Lock-In:** Month-to-month subscriptions, cancel anytime

**Target Market Segments:**
- **Starter:** Solo entrepreneurs, small cafes/hotels (1-500 conversations/month)
- **Growth:** Mid-sized businesses, multiple branches (500-5,000 conversations/month)
- **Enterprise:** Large chains, high-volume operations (5,000+ conversations/month)

---

## Real System Cost Analysis

### Infrastructure Components

#### 1. PostgreSQL Database (Persistent Storage)
**Provider:** AWS RDS PostgreSQL 16 (db.t4g.micro)  
**Monthly Cost:** $16.00  
**Specs:** 2 vCPU, 1 GB RAM, 20 GB SSD

**Usage Pattern Analysis:**
- 19 tables (Tenants, Customers, Conversations, Messages, Orders, Bookings, Payments, etc.)
- Average row size: ~500 bytes (with indexes)
- Per-conversation data footprint:
  - 1 Conversation record: 200 bytes
  - 10 Messages (avg): 5 KB
  - 1 Customer record (shared): 300 bytes
  - 1 Order/Booking (50% probability): 1 KB
  - **Total per conversation: ~6.5 KB**

**Capacity:** 20 GB ÷ 6.5 KB ≈ **3 million conversations** (before storage upgrade needed)

**Per-Conversation Cost:** $16 ÷ 50,000 conversations/month = **$0.00032 per conversation**

---

#### 2. Redis Cache (Session State + Job Queues)
**Provider:** AWS ElastiCache Redis 7 (cache.t4g.micro)  
**Monthly Cost:** $12.00  
**Specs:** 2 vCPU, 0.5 GB RAM, no persistence required

**Usage Pattern Analysis:**
- **Session Storage:** 128 KB per active session (conversation state, AI context)
- **BullMQ Queues:**
  - `ai-messages`: Max 100 jobs/minute, 5 concurrent workers
  - `outbound-messages`: Max 200 jobs/minute, 10 concurrent workers
- **Average concurrent sessions:** ~200 (peak: 500)

**Memory Breakdown:**
- Active sessions: 200 × 128 KB = 25 MB
- Job queues: 50 MB (transient, auto-cleared)
- Redis overhead: 50 MB
- **Total: ~125 MB** (well below 512 MB limit)

**Per-Conversation Cost:** $12 ÷ 50,000 conversations/month = **$0.00024 per conversation**

---

#### 3. AI Processing (External API — GPT-4 Turbo)
**Provider:** OpenAI API  
**Model:** GPT-4 Turbo (128K context)  
**Pricing:**
- Input tokens: $10 per 1M tokens
- Output tokens: $30 per 1M tokens

**Per-Conversation Usage:**
- Prompt (system + user message): ~800 tokens input
- Response: ~200 tokens output
- **Total cost per AI call:** (800 × $10) ÷ 1,000,000 + (200 × $30) ÷ 1,000,000 = **$0.014**

**Note:** Current implementation uses **fallback-only AI** (no real GPT calls yet). When full AI is enabled, this becomes the dominant cost driver.

**Per-Conversation Cost (with AI enabled):** **$0.014**

---

#### 4. Messaging Costs (WhatsApp Business API)
**Provider:** Meta (WhatsApp Business API via Twilio/Cloud API)  
**Pricing (Nigeria):**
- Service conversations: $0.0151 per conversation
- Marketing conversations: $0.0304 per conversation
- Utility conversations: $0.0069 per conversation

**Average:** **$0.015 per conversation** (assuming 80% service, 20% utility)

**Note:** Instagram/Facebook Messenger are **FREE** (no Meta charges, only API hosting costs)

---

### Total Real Cost Per Conversation

| Component | Cost per Conversation |
|-----------|----------------------|
| PostgreSQL Database | $0.00032 |
| Redis Cache | $0.00024 |
| AI Processing (GPT-4 Turbo) | $0.014 |
| WhatsApp Messaging | $0.015 |
| **Total** | **$0.02956** |

**Rounded:** **$0.03 per conversation** (real cost)

**Target Markup:** 3.5x → **$0.105 per conversation** (customer price)

---

## Pricing Tiers

### 🌱 Starter Plan — $49/month

**Target Customer:** Solo entrepreneurs, small cafes, boutique hotels  
**Included Conversations:** 500/month  
**Price per Conversation:** $49 ÷ 500 = **$0.098** (3.3x markup)

**Resource Limits:**
- 1 Tenant Account
- 1 Branch Location
- 500 Conversations/month
- 2 Concurrent Sessions
- Basic AI (fallback-only, no GPT)
- WhatsApp + Instagram + Facebook
- Email Support (48-hour response)

**Overage Pricing:** $0.12 per additional conversation  
**Use Case Example:**  
- Small restaurant taking orders via WhatsApp
- 15-20 orders/day = ~450 conversations/month
- Fits comfortably in Starter tier

---

### 🚀 Growth Plan — $199/month

**Target Customer:** Growing businesses, multiple branches, regional chains  
**Included Conversations:** 2,500/month  
**Price per Conversation:** $199 ÷ 2,500 = **$0.0796** (2.7x markup)

**Resource Limits:**
- 1 Tenant Account
- Up to 5 Branch Locations
- 2,500 Conversations/month
- 10 Concurrent Sessions
- Full AI Enabled (GPT-4 Turbo, intelligent routing)
- WhatsApp + Instagram + Facebook
- Multi-Channel Inbox Dashboard
- Priority Email Support (24-hour response)
- Monthly Analytics Report

**Overage Pricing:** $0.10 per additional conversation  
**Use Case Example:**  
- Hotel chain with 3 locations
- 80-100 bookings/month = ~2,000 conversations/month
- Benefits from AI-powered availability checks

---

### 🏢 Enterprise Plan — $799/month

**Target Customer:** Large chains, high-volume e-commerce, corporate hospitality  
**Included Conversations:** 12,000/month  
**Price per Conversation:** $799 ÷ 12,000 = **$0.0666** (2.2x markup)

**Resource Limits:**
- 1 Tenant Account
- Unlimited Branch Locations
- 12,000 Conversations/month
- 50 Concurrent Sessions
- Full AI Enabled + Custom Intent Training
- WhatsApp + Instagram + Facebook
- Multi-Channel Inbox Dashboard
- Dedicated Account Manager
- Phone + Email Support (4-hour response)
- Custom Branding (White-Label)
- SLA Guarantees (99.5% uptime)
- Weekly Analytics + BI Dashboard

**Overage Pricing:** $0.08 per additional conversation  
**Use Case Example:**  
- National fast-food chain with 20 locations
- 400 orders/day = ~12,000 conversations/month
- Needs custom AI training for menu upselling

---

### 🎯 Tier Comparison Table

| Feature | Starter | Growth | Enterprise |
|---------|---------|--------|-----------|
| **Monthly Price** | $49 | $199 | $799 |
| **Conversations/Month** | 500 | 2,500 | 12,000 |
| **Branch Locations** | 1 | 5 | Unlimited |
| **Concurrent Sessions** | 2 | 10 | 50 |
| **AI Processing** | Fallback Only | Full GPT-4 | GPT-4 + Custom |
| **Messaging Channels** | ✅ All 3 | ✅ All 3 | ✅ All 3 |
| **Dashboard Access** | Basic | Advanced | Enterprise BI |
| **Support** | Email (48h) | Email (24h) | Phone + Email (4h) |
| **White-Label Branding** | ❌ | ❌ | ✅ |
| **SLA Guarantee** | ❌ | ❌ | 99.5% Uptime |
| **Overage Rate** | $0.12/conv | $0.10/conv | $0.08/conv |

---

## Resource Limits & Scaling

### Database Scaling Triggers

| Metric | Starter | Growth | Enterprise |
|--------|---------|--------|-----------|
| **Max Customers** | 500 | 5,000 | 50,000 |
| **Max Conversations** | 500 | 10,000 | 100,000 |
| **Max Messages** | 5,000 | 100,000 | 1,000,000 |
| **Storage (GB)** | 0.5 GB | 5 GB | 50 GB |

**Auto-Scaling Plan:**
- When storage exceeds 15 GB → Upgrade to db.t4g.small ($32/month)
- When storage exceeds 50 GB → Upgrade to db.t4g.medium ($64/month)

---

### Redis Scaling Triggers

| Metric | Starter | Growth | Enterprise |
|--------|---------|--------|-----------|
| **Concurrent Sessions** | 2 | 10 | 50 |
| **Memory Usage** | 10 MB | 50 MB | 250 MB |
| **Jobs/Minute** | 10 | 50 | 200 |

**Auto-Scaling Plan:**
- When memory exceeds 400 MB → Upgrade to cache.t4g.small ($24/month, 1.37 GB)
- When concurrent sessions exceed 100 → Upgrade to cache.m6g.large ($90/month, 6.38 GB)

---

### AI Processing Rate Limits

To prevent runaway OpenAI costs, we enforce **per-tenant rate limits** via BullMQ:

```typescript
// ai-message.processor.ts (current implementation)
limiter: {
  max: 100,        // Max 100 AI jobs
  duration: 60000  // Per minute
}
```

**Tier-Specific Limits:**
- **Starter:** 10 AI calls/minute (disabled in v1, fallback-only)
- **Growth:** 50 AI calls/minute (GPT-4 Turbo enabled)
- **Enterprise:** 200 AI calls/minute (GPT-4 Turbo + custom fine-tuning)

**Cost Safety Net:** If a tenant exceeds $500 in OpenAI costs in a single month, auto-throttle AI to fallback mode and notify account owner.

---

### Messaging Rate Limits (Per Platform)

WhatsApp Business API enforces strict rate limits:
- **Tier 1:** 1,000 messages/day (new business)
- **Tier 2:** 10,000 messages/day (after quality review)
- **Tier 3:** 100,000 messages/day (high-volume verified)

**Our Tier Mapping:**
- **Starter:** Assumes customer has Tier 1 WhatsApp access (1,000 msg/day)
- **Growth:** Requires Tier 2 WhatsApp access (10,000 msg/day)
- **Enterprise:** Requires Tier 3 WhatsApp access (100,000 msg/day)

**Enforcement:** Use BullMQ limiter in `outbound-message.worker.ts` (currently: 200/minute)

---

## Payment Integration

### Current Payment Infrastructure

**Provider:** Paystack (Nigeria)  
**Transaction Fees:** 1.5% + ₦100 per transaction  
**Supported Methods:** Cards, Bank Transfer, USSD, Mobile Money

**Existing Implementation:**
- Payment initialization: `POST /api/payments/initialize`
- Payment verification: `GET /api/payments/verify`
- Webhook reconciliation: `POST /api/payments/webhook/paystack`

**Payment Flow:**
1. Customer completes order/booking
2. Backend calls Paystack to initialize payment
3. Customer redirected to Paystack checkout
4. Payment confirmed via webhook
5. Order/booking status auto-updated to "confirmed"

---

### Subscription Billing Implementation (Future)

**Billing Model:** Monthly recurring subscriptions via Paystack Plans

**Subscription Lifecycle:**
1. **Signup:** Customer selects tier (Starter/Growth/Enterprise)
2. **Payment:** Paystack Plan created, auto-charge every 30 days
3. **Usage Tracking:** Conversation counter incremented per AI job processed
4. **Overage Calculation:** At month-end, if conversations > tier limit, charge overage
5. **Renewal:** Auto-renew unless cancelled

**Database Schema Addition (Future):**
```prisma
model Subscription {
  id                String   @id @default(uuid())
  tenant_id         String   @unique
  plan_tier         String   // "starter" | "growth" | "enterprise"
  status            String   // "active" | "cancelled" | "past_due"
  current_period_start DateTime
  current_period_end   DateTime
  conversations_used   Int      @default(0)
  overage_cost_kobo    Int      @default(0)
  paystack_plan_code   String?
  paystack_subscription_code String?
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  tenant            Tenant   @relation(fields: [tenant_id], references: [id])
}
```

**Usage Tracking Hook:**
```typescript
// ai-message.processor.ts - increment conversation counter
await this.prisma.subscription.update({
  where: { tenant_id: job.data.tenantId },
  data: { conversations_used: { increment: 1 } }
})
```

---

### Pricing Transparency Features

**Customer Dashboard Widgets (Future):**
1. **Usage Meter:**
   - "You've used 347 of 500 conversations this month"
   - Progress bar with color-coding (green → yellow → red at 80%)

2. **Overage Warning:**
   - "You're approaching your limit. Upgrade to Growth for only $150 more"

3. **Cost Projection:**
   - "At current usage, estimated bill: $49 (no overages)"
   - "At current usage, estimated bill: $67 ($49 base + $18 overages)"

4. **Billing History:**
   - Monthly invoices with conversation breakdown
   - Export to PDF for accounting

---

## Billing Implementation Roadmap

### Phase 1: Usage Tracking (1 week)
- [ ] Add `Subscription` table to Prisma schema
- [ ] Create `subscriptions.service.ts` (CRUD operations)
- [ ] Hook conversation counter into AI processor worker
- [ ] Build admin dashboard to view per-tenant usage

### Phase 2: Paystack Plans Integration (1 week)
- [ ] Create Paystack Plans via API (Starter: ₦49,000/month, Growth: ₦199,000/month, Enterprise: ₦799,000/month)
- [ ] Build subscription creation flow (signup → select plan → Paystack redirect)
- [ ] Implement subscription webhook handler (`subscription.charge.success`)
- [ ] Auto-renew subscriptions on billing cycle

### Phase 3: Overage Calculation (3 days)
- [ ] Nightly cron job to calculate overages (runs at 11:59 PM on last day of month)
- [ ] Generate overage invoice via Paystack one-time charge
- [ ] Send email notification with usage breakdown

### Phase 4: Dashboard UI (1 week)
- [ ] Usage meter widget (React component)
- [ ] Billing history page (table with invoices)
- [ ] Upgrade/downgrade flow (change plan mid-cycle, prorate)
- [ ] Payment method management (update card on file)

### Phase 5: Self-Service Cancellation (2 days)
- [ ] "Cancel Subscription" button in dashboard
- [ ] Confirmation modal ("Your data will be deleted after 30 days")
- [ ] Call Paystack API to cancel subscription
- [ ] Mark tenant as `status: 'cancelled'` in database

**Total Implementation Time:** ~3-4 weeks

---

## Competitive Positioning

### Market Comparison (Nigerian Market, January 2026)

| Provider | Pricing | Conversations/Month | AI Enabled | Multi-Channel |
|----------|---------|---------------------|-----------|---------------|
| **Raven (Starter)** | ₦49,000 | 500 | ❌ Fallback | ✅ WhatsApp + IG + FB |
| **Raven (Growth)** | ₦199,000 | 2,500 | ✅ GPT-4 | ✅ WhatsApp + IG + FB |
| **Raven (Enterprise)** | ₦799,000 | 12,000 | ✅ GPT-4 Custom | ✅ WhatsApp + IG + FB |
| Competitor A | ₦75,000 | 1,000 | ❌ | WhatsApp only |
| Competitor B | ₦150,000 | Unlimited | ✅ (Basic) | WhatsApp + IG |
| Competitor C | $299/month | 5,000 | ✅ GPT-3.5 | WhatsApp only |

**Raven Competitive Advantages:**
1. **Lower Entry Price:** ₦49,000 vs ₦75,000 (35% cheaper for small businesses)
2. **Multi-Channel by Default:** WhatsApp + Instagram + Facebook (competitors charge extra)
3. **AI-Powered Growth Tier:** GPT-4 Turbo at ₦199,000 (competitors use older GPT-3.5 or no AI)
4. **Transparent Overage Pricing:** Clear per-conversation overage rates (no surprise bills)
5. **Built-in Payments:** Integrated Paystack for instant order/booking monetization

---

## Profitability Analysis

### Break-Even Analysis (Per Tier)

#### Starter Plan ($49/month)
- **Monthly Revenue:** $49
- **Included Conversations:** 500
- **Real Cost per Conversation:** $0.03 (DB + Redis + WhatsApp, **no AI**)
- **Total Cost:** 500 × $0.03 = **$15**
- **Gross Profit:** $49 - $15 = **$34 (69.4% margin)**

**Customer Acquisition Cost (CAC) Payback:** If CAC = $50 (1 month marketing spend), payback = **1.5 months**

---

#### Growth Plan ($199/month)
- **Monthly Revenue:** $199
- **Included Conversations:** 2,500
- **Real Cost per Conversation:** $0.03 (with AI: $0.015 WhatsApp + $0.014 AI + $0.001 infra)
- **Total Cost:** 2,500 × $0.03 = **$75**
- **Gross Profit:** $199 - $75 = **$124 (62.3% margin)**

**CAC Payback:** If CAC = $150 (email campaign + demo), payback = **1.2 months**

---

#### Enterprise Plan ($799/month)
- **Monthly Revenue:** $799
- **Included Conversations:** 12,000
- **Real Cost per Conversation:** $0.03
- **Total Cost:** 12,000 × $0.03 = **$360**
- **Gross Profit:** $799 - $360 = **$439 (54.9% margin)**

**CAC Payback:** If CAC = $500 (sales team + custom onboarding), payback = **1.1 months**

---

### Revenue Projections (12-Month Forecast)

**Assumptions:**
- Year 1: 80% Starter, 15% Growth, 5% Enterprise
- Monthly Churn: 5% (industry standard for SMB SaaS)
- Average Customer Lifetime: 20 months

| Month | Starter Customers | Growth Customers | Enterprise Customers | MRR | Total Revenue |
|-------|------------------|------------------|---------------------|-----|---------------|
| 1 | 20 | 3 | 1 | $1,776 | $1,776 |
| 3 | 50 | 8 | 2 | $4,640 | $13,920 |
| 6 | 100 | 15 | 4 | $9,181 | $55,086 |
| 12 | 200 | 30 | 8 | $18,170 | $218,040 |

**Year 1 ARR:** ~$218,000  
**Year 1 Gross Profit (65% margin):** ~$141,700

---

## Pricing Optimization Levers

### 1. Dynamic Overage Pricing
**Current:** Fixed overage rates ($0.12 Starter, $0.10 Growth, $0.08 Enterprise)  
**Opportunity:** Offer "overage packs" at discounted rates:
- **+500 Conversations Pack:** $50 (vs $60 at $0.12 each → 17% discount)
- **+1,000 Conversations Pack:** $90 (vs $120 → 25% discount)

**Benefit:** Reduces churn from one-time usage spikes (e.g., holiday promotions)

---

### 2. Annual Prepay Discount
**Offer:** 2 months free on annual plans (16.7% discount)  
**Example:**
- Starter Annual: $490 (vs $588 monthly) — Save $98
- Growth Annual: $1,990 (vs $2,388 monthly) — Save $398
- Enterprise Annual: $7,990 (vs $9,588 monthly) — Save $1,598

**Benefit:** Improves cash flow, reduces churn risk

---

### 3. Add-On Services (Future Revenue Streams)
- **AI Voice Assistant:** +$99/month (voice calls via Twilio)
- **Advanced Analytics:** +$49/month (custom BI dashboards, export to Google Sheets)
- **Priority Support:** +$149/month (dedicated Slack channel, 1-hour response SLA)
- **Custom Integrations:** $500-$2,000 one-time (connect to Zoho, HubSpot, etc.)

---

### 4. Partner/Reseller Program
**Wholesale Pricing:** 30% commission for agencies reselling Raven  
**Example:**
- Agency charges client $199/month for Growth plan
- Agency pays Raven $139/month (30% discount)
- Agency keeps $60/month margin

**Target Partners:** Digital marketing agencies, web developers, CRM consultants

---

## Risk Mitigation

### 1. OpenAI Cost Explosion
**Risk:** Customer sends 10,000 messages/day → $140 AI cost → unprofitable  
**Mitigation:**
- Hard rate limit: 200 AI calls/minute (enforced in BullMQ)
- Cost circuit breaker: If monthly AI cost > $500, auto-throttle to fallback mode
- Email alert to customer: "You're using AI heavily, consider Enterprise plan"

---

### 2. WhatsApp Rate Limit Violations
**Risk:** Customer exceeds Meta's messaging limits → account suspended  
**Mitigation:**
- Enforce tier-appropriate limits (Starter: 1,000/day, Growth: 10,000/day, Enterprise: 100,000/day)
- Queue messages in BullMQ with backoff (200/minute limit in `outbound-message.worker.ts`)
- Auto-pause if 24-hour limit reached, resume at midnight UTC

---

### 3. Churn Due to Overage Surprise
**Risk:** Customer gets $200 overage bill → cancels  
**Mitigation:**
- Email alert at 80% of conversation limit: "You've used 400 of 500 conversations"
- In-dashboard upgrade prompt: "Upgrade to Growth now for $150 (save $50 on overages)"
- Cap overages at 2x plan limit, then auto-pause (e.g., Starter caps at 1,000 conversations)

---

## Conclusion

**Recommended Launch Pricing:**
- ✅ **Starter: $49/month** (500 conversations, fallback AI, 1 branch)
- ✅ **Growth: $199/month** (2,500 conversations, GPT-4, 5 branches)
- ✅ **Enterprise: $799/month** (12,000 conversations, custom AI, unlimited branches)

**Next Steps:**
1. Implement subscription tracking (Phase 1 of roadmap)
2. Create Paystack Plans and integrate signup flow (Phase 2)
3. Build usage dashboard for customers (Phase 4)
4. Launch with 2-week free trial (no credit card required) to reduce friction

**Target Launch Date:** March 1, 2026 (4 weeks from today)

---

## Appendix: Sample Invoices

### Starter Plan Invoice (No Overage)
```
Raven Enterprise Bot — January 2026 Invoice

Subscription: Starter Plan               $49.00
Conversations Used: 347 of 500           Included
Overages: 0 conversations                $0.00
─────────────────────────────────────────────
Total Due:                               $49.00

Payment Method: •••• 4242 (Visa)
Next Billing Date: February 1, 2026
```

---

### Growth Plan Invoice (With Overage)
```
Raven Enterprise Bot — January 2026 Invoice

Subscription: Growth Plan                $199.00
Conversations Used: 2,847 of 2,500       Included
Overages: 347 conversations × $0.10      $34.70
─────────────────────────────────────────────
Total Due:                               $233.70

Payment Method: •••• 5555 (Mastercard)
Next Billing Date: February 1, 2026

💡 Upgrade to Enterprise to save on overages!
```

---

**Document Control:**  
- Version: 1.0 (Initial Draft)
- Approvals Required: Finance, Product, Engineering
- Review Cycle: Quarterly (adjust pricing based on actual cost data)
