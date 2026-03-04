# White-Label SaaS Strategy — Raven Enterprise Bot

**Document Version:** 1.0  
**Last Updated:** January 31, 2026  
**Objective:** Enable multi-brand deployment without code forks or separate infrastructure

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Multi-Tenant Architecture](#multi-tenant-architecture)
3. [White-Label Features](#white-label-features)
4. [Reseller/Partner Program](#resellerpartner-program)
5. [Custom Domain Mapping](#custom-domain-mapping)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Revenue Model](#revenue-model)

---

## Executive Summary

**Problem:** Traditional white-labeling requires separate codebases, infrastructure, and deployment pipelines for each brand. This creates:
- High maintenance costs (separate updates for each brand)
- Deployment complexity (multiple servers, databases, Redis instances)
- Version drift (Brand A on v1.2, Brand B on v1.0)

**Solution:** **Database-driven multi-brand architecture** where all tenants share the same codebase and infrastructure, but each has:
- Custom branding (logo, colors, business name)
- Isolated data (zero cross-tenant contamination)
- Custom domains (clientA.com, clientB.com)
- Branded AI responses ("Welcome to Restaurant ABC" vs "Welcome to Hotel XYZ")

**Business Impact:**
- **Cost Efficiency:** 1 server supports 1,000+ white-labeled brands
- **Fast Onboarding:** New brand live in <2 hours (vs 2 days with code forks)
- **Consistent Updates:** Push feature to all brands simultaneously
- **Reseller-Ready:** Agencies can sell under their own brand, pay wholesale pricing

---

## Multi-Tenant Architecture

### Current Foundation (Already Built)

Raven's existing schema supports multi-tenancy via the `Tenant` model:

```prisma
model Tenant {
  id         String   @id @default(uuid())
  name       String                    // "ABC Restaurant" or "XYZ Hotel"
  logo_url   String?                   // Custom logo URL
  theme      String?                   // JSON: {"primary": "#FF5733", "secondary": "#C70039"}
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  // All data scoped to tenant
  branches       Branch[]
  customers      Customer[]
  conversations  Conversation[]
  orders         Order[]
  bookings       Booking[]
  payments       Payment[]
}
```

**Key Principle:** Every table has a `tenant_id` foreign key → **Zero data leakage between tenants**

**Existing Isolation Mechanisms:**
1. **Database-Level:** All queries filter by `tenant_id` (enforced via Prisma)
2. **API-Level:** Every endpoint requires `?tenantId=xyz` query parameter
3. **Worker-Level:** BullMQ jobs carry `tenantId`, ensuring AI responses use correct branding

---

### White-Label Enhancement: Branding Service

**Existing Implementation:**

```typescript
// libs/tenant/branding/branding.service.ts
export class BrandingService {
  async getBranding(tenantId: string): Promise<BrandingConfig> {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } })
    return {
      name: tenant?.name,          // "Mama Cass Kitchen"
      logoUrl: tenant?.logo_url,   // "https://cdn.example.com/mama-cass-logo.png"
      theme: tenant?.theme,        // '{"primary": "#FF5733"}'
    }
  }

  async setBranding(tenantId: string, config: BrandingConfig): Promise<void> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: config.name,
        logo_url: config.logoUrl,
        theme: config.theme,
      }
    })
  }
}
```

**Usage in AI Responses:**

```typescript
// ai-message.processor.ts (enhanced)
const branding = await this.brandingService.getBranding(job.data.tenantId)

const aiPrompt = `
You are a helpful assistant for ${branding.name}.
Greet customers with: "Welcome to ${branding.name}!"
Use a friendly, professional tone consistent with our restaurant brand.
`

const response = await this.aiService.processMessage({
  sessionId: job.data.conversationId,
  text: job.data.content,
  tenantId: job.data.tenantId,
  branding: branding  // Pass branding context to AI
})
```

**Result:** AI says "Welcome to Mama Cass Kitchen!" for Tenant A, "Welcome to Golden Palace Hotel!" for Tenant B — **same code, different branding.**

---

## White-Label Features

### Tier-Based White-Label Access

| Feature | Starter | Growth | Enterprise |
|---------|---------|--------|-----------|
| **Custom Business Name** | ✅ | ✅ | ✅ |
| **Custom Logo (Dashboard)** | ❌ | ✅ | ✅ |
| **Custom Theme Colors** | ❌ | ✅ | ✅ |
| **Branded AI Responses** | ❌ | ✅ | ✅ |
| **Custom Domain** | ❌ | ❌ | ✅ |
| **Remove "Powered by Raven"** | ❌ | ❌ | ✅ |
| **White-Label Mobile App** | ❌ | ❌ | ✅ (Add-on) |

---

### 1. Custom Business Name & Logo

**Implementation:**
- Tenant uploads logo via dashboard → Stored in S3/Cloudinary
- Logo displayed in:
  - Dashboard header
  - AI chat widget (if embedded on website)
  - Email notifications
  - Invoice/receipt PDFs

**Example:**
```json
// GET /api/tenant/branding?tenantId=tenant-abc
{
  "name": "Mama Cass Kitchen",
  "logoUrl": "https://cdn.raven.com/logos/mama-cass.png",
  "theme": {
    "primary": "#FF5733",
    "secondary": "#C70039"
  }
}
```

**Dashboard UI (React Component):**
```tsx
// dashboard/components/Header.tsx
import { useBranding } from '@/hooks/useBranding'

export function Header() {
  const { branding } = useBranding()
  
  return (
    <header className="flex items-center gap-4 p-4 bg-white shadow">
      {branding.logoUrl && (
        <img src={branding.logoUrl} alt={branding.name} className="h-10" />
      )}
      <h1 className="text-xl font-bold">{branding.name} Dashboard</h1>
    </header>
  )
}
```

---

### 2. Custom Theme Colors

**Theme JSON Schema:**

```json
{
  "primary": "#FF5733",        // Main brand color (buttons, links)
  "secondary": "#C70039",      // Secondary color (accents)
  "success": "#28A745",        // Success states (payment confirmed)
  "error": "#DC3545",          // Error states (payment failed)
  "background": "#F8F9FA",     // Page background
  "text": "#212529",           // Primary text color
  "font": "Inter, sans-serif"  // Custom font family
}
```

**CSS Injection (Dashboard):**

```tsx
// dashboard/app/layout.tsx
export default function RootLayout({ children }) {
  const { branding } = useBranding()
  const theme = JSON.parse(branding.theme || '{}')
  
  return (
    <html>
      <head>
        <style>{`
          :root {
            --color-primary: ${theme.primary || '#3B82F6'};
            --color-secondary: ${theme.secondary || '#8B5CF6'};
            --font-family: ${theme.font || 'system-ui'};
          }
          .btn-primary {
            background-color: var(--color-primary);
          }
        `}</style>
      </head>
      <body className="font-[var(--font-family)]">
        {children}
      </body>
    </html>
  )
}
```

**Result:** Tenant A has red buttons, Tenant B has blue buttons — **same HTML, different CSS variables.**

---

### 3. Branded AI Responses

**Customization Levels:**

**Level 1: Dynamic Business Name (All Tiers)**
```
Input: "Hi"
Output: "Welcome to {tenant.name}! How can I help you today?"
```

**Level 2: Custom Greeting Message (Growth+)**
```json
// Tenant config
{
  "aiGreeting": "Ẹ káàbọ̀ sí Mama Cass Kitchen! Kí ni mo lè ṣe fún ọ?" // Yoruba
}
```

**Level 3: Custom AI Personality (Enterprise)**
```json
// Tenant config
{
  "aiPersonality": "casual",  // vs "formal", "friendly", "professional"
  "aiTone": "Use Nigerian Pidgin for greetings, then switch to English for transactions."
}
```

**Prompt Construction:**

```typescript
// ai.service.ts (enhanced)
function buildSystemPrompt(branding: BrandingConfig, personality: string) {
  const basePrompt = `You are an AI assistant for ${branding.name}.`
  
  const personalityMap = {
    casual: "Be warm and conversational. Use emojis sparingly (😊 🍽️).",
    formal: "Be polite and professional. Avoid slang or emojis.",
    friendly: "Be upbeat and helpful. End messages with 'Have a great day!'"
  }
  
  return `${basePrompt}\n${personalityMap[personality] || personalityMap.friendly}`
}
```

---

### 4. Remove "Powered by Raven" Branding (Enterprise Only)

**Default Footer (Starter/Growth):**
```
───────────────────────
Powered by Raven Enterprise Bot
https://raven.ai
```

**Enterprise White-Label:**
```json
// Tenant config
{
  "hidePoweredBy": true  // Only allowed if plan_tier === 'enterprise'
}
```

**Implementation:**

```typescript
// message.sender.ts
async sendMessage(content: string, tenantId: string) {
  const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
  
  let footer = ''
  if (tenant.plan_tier !== 'enterprise') {
    footer = '\n\n───────────────────────\nPowered by Raven Enterprise Bot'
  }
  
  await this.whatsappAPI.send({
    to: customer.phone,
    text: content + footer
  })
}
```

---

### 5. Custom Domain Mapping (Enterprise Only)

**Problem:** Tenant wants customers to access dashboard at `orders.mamacasskitchen.com` (not `app.raven.ai/tenant-abc`)

**Solution:** DNS CNAME + Dynamic Tenant Resolution

**Setup Process:**

1. **Tenant configures custom domain:**
   ```json
   // POST /api/tenant/domain
   {
     "tenantId": "tenant-abc",
     "customDomain": "orders.mamacasskitchen.com"
   }
   ```

2. **Raven provides DNS instructions:**
   ```
   Add CNAME record:
   
   Host: orders.mamacasskitchen.com
   Value: app.raven.ai
   TTL: 3600
   ```

3. **Backend resolves tenant by domain:**

   ```typescript
   // tenant.middleware.ts (enhanced)
   export class TenantMiddleware implements NestMiddleware {
     async use(req: Request, res: Response, next: NextFunction) {
       const hostname = req.hostname  // "orders.mamacasskitchen.com"
       
       // Try custom domain lookup
       const tenant = await this.prisma.tenant.findFirst({
         where: { custom_domain: hostname }
       })
       
       if (tenant) {
         req.tenantId = tenant.id  // Inject tenant context
       } else {
         // Fallback: extract from query param or subdomain
         req.tenantId = req.query.tenantId || extractFromSubdomain(hostname)
       }
       
       next()
     }
   }
   ```

4. **SSL Certificate Auto-Provisioning (via Let's Encrypt):**

   ```bash
   # Use Caddy server (auto HTTPS) or Certbot
   certbot certonly --dns-cloudflare \
     -d orders.mamacasskitchen.com \
     --cert-name mamacass
   ```

**Result:** Customer visits `orders.mamacasskitchen.com` → Sees "Mama Cass Kitchen Dashboard" with custom logo/theme — **no mention of Raven.**

---

## Reseller/Partner Program

### Business Model

**Target Partners:**
- Digital marketing agencies
- Web development firms
- Restaurant/hotel consultants
- Industry-specific SaaS resellers (e.g., "HospitalityTech Solutions")

**Value Proposition for Partners:**
> "Sell Raven under your own brand. We handle infrastructure, support, and updates. You keep 30% margin and own the customer relationship."

---

### Wholesale Pricing (30% Partner Discount)

| Plan | Retail Price | Wholesale Price | Partner Margin |
|------|--------------|-----------------|----------------|
| Starter | ₦49,000/mo | ₦34,300/mo | ₦14,700/mo (30%) |
| Growth | ₦199,000/mo | ₦139,300/mo | ₦59,700/mo (30%) |
| Enterprise | ₦799,000/mo | ₦559,300/mo | ₦239,700/mo (30%) |

**Example Partner Revenue:**
- 10 Starter customers: ₦147,000/month margin
- 5 Growth customers: ₦298,500/month margin
- 2 Enterprise customers: ₦479,400/month margin
- **Total: ₦924,900/month (~$1,200 USD)** for managing 17 customers

---

### Partner Onboarding Process

**Step 1: Partner Agreement**
- Sign reseller contract (30% wholesale pricing, non-compete clause)
- Receive partner portal credentials
- Configure partner branding (logo, theme)

**Step 2: Create Partner-Branded Tenant Template**

```json
// POST /api/partners/create-template
{
  "partnerId": "partner-xyz",
  "brandingTemplate": {
    "name": "{{CUSTOMER_NAME}}",  // Dynamic placeholder
    "logoUrl": "https://partner-cdn.com/logo.png",  // Partner's logo by default
    "theme": "{\"primary\": \"#4A90E2\"}",  // Partner's brand colors
    "aiGreeting": "Welcome to {{CUSTOMER_NAME}}! Powered by TechSolutions Agency."
  }
}
```

**Step 3: Partner Creates Customer Tenants**

```typescript
// Partner dashboard: "Add New Customer" button
async function createCustomerTenant(partnerForm) {
  const response = await fetch('/api/partners/tenants', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${partnerToken}` },
    body: JSON.stringify({
      partnerId: 'partner-xyz',
      customerName: 'ABC Restaurant',
      planTier: 'growth',
      branding: {
        name: 'ABC Restaurant',
        logoUrl: 'https://abc-restaurant.com/logo.png'
      }
    })
  })
  
  // Returns tenantId, API credentials, setup instructions
}
```

**Step 4: Billing**
- Partner pays Raven wholesale price monthly (auto-debit via Paystack)
- Partner bills end customer at retail price (partner handles invoicing)
- Partner keeps margin difference

---

### Partner Portal Features

**Dashboard Metrics:**
- Total customers: 17
- Active subscriptions: 15
- MRR (Monthly Recurring Revenue): ₦2,985,000 (retail)
- Your margin: ₦924,900 (30%)
- Overdue payments: 2 customers

**Customer Management:**
- Add/remove customers
- Upgrade/downgrade plans
- View usage stats per customer
- Access customer support tickets

**White-Label Control:**
- Set default branding for all customers
- Upload partner logo (appears in customer dashboards if not customized)
- Configure AI greeting template

**Billing Automation:**
- Auto-charge partner account on 1st of month
- Download invoices (for partner's accountant)
- Export customer usage report (for partner's billing system)

---

### Revenue Share Model (Alternative to Wholesale)

**For Larger Partners (e.g., SaaS aggregators):**

Instead of wholesale pricing, offer **revenue share**:
- Partner brings customer, Raven handles billing directly
- Raven charges customer full retail price
- Partner receives 20% commission monthly (vs 30% markup if partner handles billing)

**Example:**
- Customer pays Raven ₦199,000/month (Growth plan)
- Raven pays partner ₦39,800/month (20% commission)
- Benefit: Partner doesn't handle billing/payment failures

**When to Use:**
- Partner prefers passive income (no billing management)
- Partner has large customer base (100+ referrals)
- Partner wants Raven to handle support (less overhead)

---

## Custom Domain Mapping

### Architecture

**Current Setup (Shared Domain):**
```
app.raven.ai/tenant-abc  → Tenant ABC dashboard
app.raven.ai/tenant-xyz  → Tenant XYZ dashboard
```

**White-Label Setup (Custom Domains):**
```
orders.mamacass.com      → Tenant ABC dashboard (custom domain)
bookings.goldenpalace.ng → Tenant XYZ dashboard (custom domain)
```

---

### Implementation Steps

#### 1. Database Schema Enhancement

```prisma
model Tenant {
  id             String   @id @default(uuid())
  name           String
  logo_url       String?
  theme          String?
  custom_domain  String?  @unique  // NEW: "orders.mamacass.com"
  ssl_cert_path  String?           // NEW: Path to SSL certificate
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt
  
  @@index([custom_domain])  // Fast domain lookup
}
```

#### 2. Tenant Resolver Middleware

```typescript
// tenant.middleware.ts
export class TenantMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const hostname = req.hostname
    
    // Check if custom domain exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { custom_domain: hostname }
    })
    
    if (tenant) {
      req.tenantId = tenant.id
      req.tenantBranding = {
        name: tenant.name,
        logoUrl: tenant.logo_url,
        theme: tenant.theme
      }
    } else {
      // Fallback: subdomain or query param
      const subdomain = hostname.split('.')[0]  // "tenant-abc" from "tenant-abc.raven.ai"
      req.tenantId = req.query.tenantId || subdomain
    }
    
    next()
  }
}
```

#### 3. Nginx/Caddy Reverse Proxy

**Option A: Caddy (Automatic HTTPS)**

```caddyfile
# Caddyfile
orders.mamacass.com {
  reverse_proxy localhost:4000 {
    header_up Host {host}
    header_up X-Real-IP {remote}
  }
}

bookings.goldenpalace.ng {
  reverse_proxy localhost:4000 {
    header_up Host {host}
    header_up X-Real-IP {remote}
  }
}

# Wildcard for main app
*.raven.ai, raven.ai {
  reverse_proxy localhost:4000
}
```

**Option B: Nginx + Certbot**

```nginx
# /etc/nginx/sites-available/raven-white-label
server {
  listen 443 ssl http2;
  server_name orders.mamacass.com;
  
  ssl_certificate /etc/letsencrypt/live/mamacass/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/mamacass/privkey.pem;
  
  location / {
    proxy_pass http://localhost:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}

# Repeat for each custom domain...
```

**Auto-Generate Nginx Config:**

```typescript
// admin.controller.ts
@Post('/tenant/domain/provision')
async provisionCustomDomain(@Body() body: { tenantId: string; customDomain: string }) {
  // 1. Update database
  await this.prisma.tenant.update({
    where: { id: body.tenantId },
    data: { custom_domain: body.customDomain }
  })
  
  // 2. Generate nginx config
  const nginxConfig = `
server {
  listen 443 ssl http2;
  server_name ${body.customDomain};
  ssl_certificate /etc/letsencrypt/live/${body.customDomain}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${body.customDomain}/privkey.pem;
  location / {
    proxy_pass http://localhost:4000;
    proxy_set_header Host $host;
  }
}
  `
  
  // 3. Write to /etc/nginx/sites-available/
  fs.writeFileSync(`/etc/nginx/sites-available/${body.customDomain}`, nginxConfig)
  
  // 4. Symlink to sites-enabled
  fs.symlinkSync(
    `/etc/nginx/sites-available/${body.customDomain}`,
    `/etc/nginx/sites-enabled/${body.customDomain}`
  )
  
  // 5. Reload nginx
  execSync('sudo nginx -t && sudo systemctl reload nginx')
  
  // 6. Provision SSL cert
  execSync(`sudo certbot certonly --nginx -d ${body.customDomain} --non-interactive --agree-tos`)
  
  return { success: true, message: `${body.customDomain} is now live!` }
}
```

---

### DNS Setup Instructions (For Customers)

**Email Template:**

```
Subject: Final Step: Configure Your Custom Domain

Hi {customer_name},

Great! We've configured {custom_domain} on our servers. 

To complete the setup, please add this DNS record:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Record Type: CNAME
Host/Name: orders (or @ if using root domain)
Value/Points To: app.raven.ai
TTL: 3600 (or automatic)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Where to Add This:
1. Log in to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.)
2. Go to DNS Management / DNS Settings
3. Click "Add Record"
4. Paste the values above
5. Save

⏱️ Propagation Time: 5 minutes to 48 hours (usually <1 hour)

Need Help? Reply to this email or WhatsApp us at +234-800-RAVEN-AI.

Best,
Raven Support Team
```

---

## Implementation Roadmap

### Phase 1: Basic White-Label (2 weeks)

**Goals:**
- Custom business name & logo per tenant
- Branded AI responses (use tenant.name in greetings)
- Custom theme colors (CSS variables in dashboard)

**Tasks:**
- [ ] Enhance `Tenant` model with `logo_url`, `theme` (already exists ✅)
- [ ] Build branding API endpoints (`GET/POST /api/tenant/branding`)
- [ ] Update AI prompt builder to inject `branding.name`
- [ ] Dashboard UI: Upload logo + color picker
- [ ] Test: Create 2 test tenants, verify isolated branding

**Deliverables:**
- API endpoint: `/api/tenant/branding`
- Dashboard page: Settings > Branding
- Documentation: White-label setup guide

---

### Phase 2: Reseller Program (2 weeks)

**Goals:**
- Partner portal for agencies/resellers
- Wholesale pricing (30% discount)
- Partner can create customer tenants via API

**Tasks:**
- [ ] Create `Partner` model (id, name, commission_rate, status)
- [ ] Partner authentication (separate login from tenants)
- [ ] Partner dashboard (list customers, view MRR, add/remove tenants)
- [ ] Billing automation (charge partners wholesale, not end customers)
- [ ] Partner API key generation (for programmatic tenant creation)

**Deliverables:**
- Partner portal UI: `partners.raven.ai`
- API endpoint: `POST /api/partners/tenants`
- Partner agreement template (legal doc)

---

### Phase 3: Custom Domains (1 week)

**Goals:**
- Enterprise customers use their own domains (e.g., `orders.mamacass.com`)
- Automatic SSL provisioning
- Tenant resolution by domain

**Tasks:**
- [ ] Add `custom_domain` column to `Tenant` model
- [ ] Tenant resolver middleware (check `custom_domain` first)
- [ ] Nginx/Caddy config generator (auto-create reverse proxy rules)
- [ ] SSL cert automation (Certbot or Caddy auto-HTTPS)
- [ ] DNS setup wizard in dashboard

**Deliverables:**
- Admin endpoint: `POST /api/admin/domain/provision`
- Customer wizard: "Connect Your Domain" (step-by-step DNS instructions)
- Monitoring: Alert if SSL cert expires in 7 days

---

### Phase 4: Advanced White-Label (2 weeks)

**Goals:**
- Remove "Powered by Raven" footer (Enterprise only)
- Custom AI personality (casual vs formal tone)
- White-label mobile app (React Native rebrand)

**Tasks:**
- [ ] Feature flag: `hidePoweredBy` (check plan_tier === 'enterprise')
- [ ] AI personality config (JSON schema for tone, greeting, sign-off)
- [ ] Mobile app build pipeline (environment variables for logo, theme)
- [ ] App Store submission guide (partner submits under their Apple Developer account)

**Deliverables:**
- Config UI: Settings > AI Personality
- Mobile app: `raven-mobile` repo with branding injection scripts
- Documentation: How to publish white-label mobile app

---

### Total Timeline: 7 weeks

**Dependencies:**
- Phase 1 → Phase 2 (partners need basic branding before reselling)
- Phase 2 → Phase 3 (custom domains make sense after reseller program launches)
- Phase 3 → Phase 4 (advanced features after core white-label is stable)

---

## Revenue Model

### Direct Sales (Raven-Branded)

**Year 1 Targets:**
- 200 Starter customers × ₦49,000 = ₦9,800,000/month
- 30 Growth customers × ₦199,000 = ₦5,970,000/month
- 8 Enterprise customers × ₦799,000 = ₦6,392,000/month

**Total MRR:** ₦22,162,000/month (~$29,000 USD)  
**Year 1 ARR:** ₦265,944,000 (~$350,000 USD)

---

### Partner Channel (White-Label Resellers)

**Assumptions:**
- 5 partners sign up in Year 1
- Each partner brings 10 customers on average
- Mix: 60% Starter, 30% Growth, 10% Enterprise

**Partner 1 (Digital Agency):**
- 6 Starter × ₦34,300 = ₦205,800/month (wholesale)
- 3 Growth × ₦139,300 = ₦417,900/month
- 1 Enterprise × ₦559,300 = ₦559,300/month
- **Total Revenue to Raven:** ₦1,183,000/month

**5 Partners × ₦1,183,000 = ₦5,915,000/month**  
**Partner Channel ARR:** ₦70,980,000 (~$93,000 USD)

---

### Combined Revenue (Direct + Partner)

**Total Year 1 ARR:** ₦336,924,000 (~$443,000 USD)

**Breakdown:**
- Direct sales: 79% (₦265M)
- Partner channel: 21% (₦70M)

**Gross Margin:**
- Infrastructure cost: ₦0.03 per conversation
- Average customer: 1,500 conversations/month
- Cost: 1,500 × ₦0.03 = ₦45 per customer/month
- Average revenue per customer: ₦120,000/month
- **Gross margin: 99.96%** (SaaS infrastructure is highly scalable)

---

## Case Studies (Hypothetical)

### Case Study 1: "TechSolutions Agency" (Partner)

**Profile:**
- Digital marketing agency in Lagos
- 50+ restaurant clients
- Previously manual WhatsApp management for clients

**Raven Partnership:**
- Sells Raven Growth Plan as "TechSolutions AI Concierge" (white-labeled)
- Charges clients ₦250,000/month (₦51,000 markup over wholesale ₦199,000)
- Pays Raven ₦139,300/month (wholesale price)
- Keeps ₦110,700/month per client

**Results (6 months):**
- 15 clients onboarded
- Revenue: 15 × ₦110,700 = ₦1,660,500/month margin
- Annual margin: ₦19,926,000 (~$26,000 USD)
- Customer retention: 93% (1 churn in 6 months)

**Testimonial:**
> "Raven white-label lets us offer AI chatbots without hiring engineers. We focus on sales and client success, Raven handles infrastructure. It's a game-changer."  
> — *Chidi Okonkwo, CEO, TechSolutions Agency*

---

### Case Study 2: "HospitalityHub" (SaaS Aggregator)

**Profile:**
- B2B SaaS platform for hotel management
- 200+ hotel customers across West Africa
- Existing products: PMS, Channel Manager, Revenue Optimization

**Raven Integration:**
- White-labels Raven as "HospitalityHub Messaging"
- Bundles with existing products (₦500,000/month all-in)
- Revenue share model: HospitalityHub gets 20% commission

**Results (12 months):**
- 50 hotels activated Raven module
- Average plan: Growth (₦199,000/month)
- Commission: 50 × ₦199,000 × 20% = ₦1,990,000/month
- Annual commission: ₦23,880,000 (~$31,000 USD)

**Testimonial:**
> "We didn't want to build our own AI chatbot (2-year dev cycle). Raven gave us production-ready tech in 2 weeks. Our customers love it."  
> — *Amaka Nwosu, Product Lead, HospitalityHub*

---

## Risk Mitigation

### Risk 1: Partner Churns, Takes Customers

**Scenario:** TechSolutions Agency stops paying Raven, tries to migrate their 15 customers to a competitor.

**Mitigation:**
- **Contract Clause:** "Customer data remains property of Raven. Upon contract termination, partner has 30 days to export customer data or renew contract."
- **Customer Relationship:** Send monthly "Powered by Raven" email to end customers (even in white-label mode) with direct support link. If partner churns, customers can continue directly with Raven.
- **Lock-In Incentive:** Offer partners 40% discount after 12 months of consistent payment (up from 30%).

---

### Risk 2: Too Many Custom Domains (Ops Overhead)

**Scenario:** 100 Enterprise customers each want custom domains → 100 nginx configs, 100 SSL certs to manage.

**Mitigation:**
- **Automation:** Use Caddy server (auto HTTPS, no manual cert management)
- **Managed Service:** Charge ₦50,000 one-time setup fee for custom domain
- **Limit:** Max 1 custom domain per tenant (no subdomains like `orders.mamacass.com` AND `bookings.mamacass.com`)

---

### Risk 3: White-Label Dilutes Raven Brand

**Scenario:** Partners sell poorly, Raven gets associated with low-quality service.

**Mitigation:**
- **Partner Vetting:** Require partners to have 5+ customers before white-label access
- **Quality Monitoring:** If partner's customers have >10% churn rate, review partnership
- **Direct Option:** Always offer Raven-branded version at same price (customer choice)

---

## Competitive Advantage

### vs Traditional White-Label SaaS

| Aspect | Traditional (Code Fork) | Raven (Multi-Tenant) |
|--------|------------------------|----------------------|
| **Deployment** | 1 server per brand | 1 server, unlimited brands |
| **Cost** | $200/brand/month | $0 incremental cost |
| **Updates** | Manual per brand | Push once, all brands updated |
| **Onboarding** | 2-3 days | <2 hours |
| **Custom Domains** | Requires DevOps | Self-service wizard |
| **Data Isolation** | Physical (separate DBs) | Logical (row-level tenant_id) |

**Raven's Edge:** **10x faster onboarding, 100x lower ops cost.**

---

## Conclusion

**White-Label Readiness Summary:**

✅ **Foundation Built:**
- Multi-tenant schema (tenant_id in all tables)
- Branding service (logo, theme, custom name)
- Tenant isolation (zero data leakage)

🚧 **Next Steps (7-week roadmap):**
- Phase 1: Enhanced branding UI (logo upload, theme picker)
- Phase 2: Partner portal + wholesale billing
- Phase 3: Custom domains + auto SSL
- Phase 4: Remove "Powered by Raven" + AI personality config

💰 **Revenue Upside:**
- Direct: ₦265M ARR (Year 1)
- Partners: ₦70M ARR (Year 1)
- **Total: ₦336M (~$443K USD)**

🎯 **Target Customers:**
- **Direct:** SMB restaurants/hotels (200-300 customers)
- **Partners:** Digital agencies (5-10 partners, 50-100 end customers)
- **Enterprise:** Large chains with custom domains (8-15 customers)

**White-label transforms Raven from a SaaS product into a SaaS platform** — enabling others to build businesses on top of our infrastructure. This is how we scale to 1,000+ customers without 1,000x support burden.

---

**Next Action:** Implement Phase 1 (Basic White-Label) and recruit first partner for beta testing. Target launch: March 15, 2026.
