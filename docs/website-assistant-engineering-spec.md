# Website Assistant And Funnel Engineering Spec

Date: 2026-06-02

## Scope

This document defines the phased engineering plan for adding:

- A tenant-configurable website customer support and chat assistant
- A copy-paste JavaScript embed for customer websites
- Visitor tracking and analytics for embedded websites
- Mobile push alerts for new visitors and high-intent actions
- A softer public acquisition funnel into Raven Business Assistant
- A new promo plan with a 7-day free trial path

This spec is grounded in the current repository structure:

- `backend/` owns APIs, workers, Prisma, billing, notifications, analytics, and AI runtime
- `dashboard/` owns tenant web onboarding and product setup
- `admin-console/` owns plan management and platform controls
- `mobile/` owns push notifications and operator mobile workflows
- `public_html/` owns the public marketing site

## Current State Summary

### Already Present

- Tenant FAQs and bot knowledge via `TenantFaq`
- Structured bot configuration via `TenantBotConfig`
- Legacy bot settings persisted in `Tenant.theme`
- Subscription and plan data via `Subscription` and `Plan`
- Admin plan management in the admin console
- Mobile push token registration and app notifications
- Dashboard registration and onboarding flows

### Main Phase 1 Problem

Bot configuration is split between two storage paths:

- Legacy: `Tenant.theme` stores `BOT_ENABLED` and `BOT_SYSTEM_PROMPT`
- Structured: `TenantBotConfig` is already used by the AI worker and the `api/bot-config` controller

Plans also have duplicated display logic across clients instead of using a single active-plan API.

## Product Goals

### Website Assistant

Each tenant should be able to:

- Create a website chat assistant for one or more verified domains
- Configure the bot name, avatar, welcome message, launcher label, widget color, and CTA content
- Train the assistant from FAQs, business details, products, services, and selected website pages
- Copy a JavaScript snippet and place it in their site header
- Track visitors, chats, conversions, and intent signals in RBA

### Visitor Analytics

The embedded assistant should capture and record:

- New visitor vs returning visitor
- First seen and last seen timestamps
- IP-derived country and region where permitted
- Referrer, landing page, path history, device hints, and UTM values
- Chat opened, chat started, lead captured, CTA clicked, and handoff requested events

### Notifications

The system should send tenant mobile push alerts such as:

- `New visitor on <site name>`
- `Visitor started a chat on <site name>`
- `Qualified lead captured on <site name>`
- `Visitor requested a human on <site name>`

### Acquisition Funnel

The public site should ease visitors into RBA with:

- A short diagnostic questionnaire
- Two main routes: WhatsApp automation or website customer support assistant
- A guided recommendation instead of a hard direct signup jump
- A promo plan with a 7-day free trial and later paid conversion

## Guiding Architecture Decisions

### Canonical Bot Config

`TenantBotConfig` becomes the canonical configuration source for bot behavior and website assistant settings.

`Tenant.theme` remains compatibility-only during migration and should not receive new assistant fields.

### Embed Delivery Model

The customer embeds a lightweight Raven script loaded from `raven-ai.online`. That script:

- Loads tenant-specific public widget config
- Validates the requesting domain
- Renders the launcher
- Opens a hosted widget UI in an iframe or isolated client surface

This keeps widget behavior updateable without forcing customers to replace embedded code.

### Analytics Storage

Visitor analytics should use explicit Prisma models, not overloaded audit logs. Audit logs may mirror selected high-value actions, but they should not be the primary store for web-visitor event analytics.

### Plan Retrieval

Client apps should consume active plans from backend APIs instead of hardcoding plan cards in multiple surfaces.

## Phase Plan

## Phase 1: Foundation Normalization

### Goals

- Normalize bot config onto `TenantBotConfig`
- Expose API-driven active-plan retrieval for tenant and public flows
- Stop introducing new duplicated plan definitions in clients
- Produce a stable contract for later website-assistant work

### Deliverables

- Canonical bot-config read and write path
- Backward-compatible fallback from legacy theme values
- Public active-plans endpoint for signup and funnel pages
- Tenant active-plans endpoint for upgrade flows
- Dashboard and mobile clients updated to consume canonical APIs

### Database Model Work

No new tables are required in Phase 1.

Optional Phase 1.1 migration:

- Backfill `TenantBotConfig.system_prompt` from `Tenant.theme.BOT_SYSTEM_PROMPT`
- Backfill `TenantBotConfig.enabled` if an enable field is added in the model

### Recommended Prisma Change In Phase 1

Extend `TenantBotConfig` with:

- `enabled Boolean @default(false)`

Rationale:

- Bot enablement belongs with the structured bot config, not in theme JSON
- This avoids a permanent split between prompt config and activation state

### Backend API Endpoints

#### Canonical Tenant Bot Config

- `GET /api/bot-config`
  - Auth: tenant JWT required
  - Returns canonical bot config for the tenant
  - Compatibility rule: if `system_prompt` is missing, fallback to legacy theme prompt until migration is complete

- `PUT /api/bot-config`
  - Auth: tenant JWT required
  - Upserts structured bot config
  - Owns: `enabled`, `system_prompt`, `personality_tone`, `fallback_reply`, `about_reply_text`, `about_image_url`, `about_cta_url`, `about_cta_label`, `escalation_message`

#### Public Plan Retrieval

- `GET /api/plans/public`
  - Auth: none
  - Returns only active plans sorted by `sort_order`
  - Used by public funnel and register page

Response shape:

```json
{
  "plans": [
    {
      "tier": "starter",
      "name": "Starter",
      "description": "Perfect for small businesses getting started with AI.",
      "price_kobo": 4900000,
      "conversations_limit": 500,
      "overage_price_kobo": 12000,
      "features": ["500 conversations/month", "WhatsApp bot"],
      "is_active": true,
      "sort_order": 1
    }
  ]
}
```

#### Tenant Plan Retrieval

- `GET /api/plans`
  - Auth: tenant JWT required
  - Returns active plans for upgrade and subscription UI
  - Same shape as public plans, optionally with current plan metadata

Optional enriched tenant response:

```json
{
  "plans": [...],
  "currentPlanTier": "starter"
}
```

### UI Pages Affected In Phase 1

#### Dashboard

- Registration page
  - Replace hardcoded plan definitions with `GET /api/plans/public`

- Plan upgrade modal
  - Replace hardcoded plan definitions with `GET /api/plans`

- Subscription page
  - Read plan metadata from API instead of local constants where applicable

#### Mobile

- Bot screen
  - Read and write canonical `api/bot-config`

- Subscription screen
  - Use backend plan metadata for display where possible

### Acceptance Criteria

- One canonical bot-config API is used by tenant-facing UIs
- Legacy theme fallback remains safe for older tenants
- Registration and upgrade flows no longer rely on locally hardcoded plan arrays
- No new bot settings are written into `Tenant.theme`

## Phase 2: Website Assistant Domain Model And Embed Runtime

### Goals

- Create tenant-owned website assistant records
- Deliver a copy-paste embed script
- Validate allowed customer domains
- Render a branded on-site chat assistant

### Database Models

```prisma
model WebsiteAssistant {
  id                    String   @id @default(uuid())
  tenant_id             String
  name                  String
  status                String   @default("draft")
  public_embed_key      String   @unique
  verified_primary_url  String?
  widget_title          String?
  widget_subtitle       String?
  launcher_label        String?
  welcome_message       String?
  placeholder_text      String?
  theme_color           String?  // hex
  text_color            String?
  avatar_url            String?
  position              String   @default("bottom-right")
  show_branding         Boolean  @default(true)
  collect_name          Boolean  @default(false)
  collect_email         Boolean  @default(false)
  collect_phone         Boolean  @default(false)
  handoff_enabled       Boolean  @default(true)
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  tenant Tenant @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  domains WebsiteAssistantDomain[]
  knowledgeSources WebsiteKnowledgeSource[]
  visitors WebsiteVisitor[]

  @@index([tenant_id])
  @@index([status])
}

model WebsiteAssistantDomain {
  id                   String   @id @default(uuid())
  assistant_id         String
  hostname             String
  verification_status  String   @default("pending")
  verification_token   String?
  verified_at          DateTime?
  created_at           DateTime @default(now())

  assistant WebsiteAssistant @relation(fields: [assistant_id], references: [id], onDelete: Cascade)

  @@unique([assistant_id, hostname])
  @@index([hostname])
}

model WebsiteKnowledgeSource {
  id                 String   @id @default(uuid())
  assistant_id       String
  source_type        String   // faq | business_details | catalogue | manual_page | crawler
  source_label       String
  source_url         String?
  is_enabled         Boolean  @default(true)
  crawl_status       String?
  last_crawled_at    DateTime?
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  assistant WebsiteAssistant @relation(fields: [assistant_id], references: [id], onDelete: Cascade)

  @@index([assistant_id])
}
```

### Backend API Endpoints

- `GET /api/website-assistant`
- `POST /api/website-assistant`
- `PUT /api/website-assistant/:id`
- `POST /api/website-assistant/:id/domains`
- `POST /api/website-assistant/:id/domains/:domainId/verify`
- `GET /widget/config/:publicEmbedKey`
- `POST /widget/session/:publicEmbedKey`
- `POST /widget/events/:publicEmbedKey`
- `POST /widget/chat/:publicEmbedKey/message`

### UI Pages

#### Dashboard

- Website Assistant overview page
- Assistant appearance and behavior page
- Domains and verification page
- Knowledge sources page
- Embed code page with live preview

#### Mobile

- Assistant summary card
- Visitor alert preferences page
- Assistant performance overview page

## Phase 3: Visitor Tracking, Sessions, And Analytics

### Goals

- Record visitors and sessions from embedded sites
- Distinguish new and returning visitors
- Track source, path, device, geography, and intent
- Surface analytics inside RBA and mobile

### Database Models

```prisma
model WebsiteVisitor {
  id                    String   @id @default(uuid())
  assistant_id          String
  tenant_id             String
  visitor_fingerprint   String
  first_seen_at         DateTime
  last_seen_at          DateTime
  visit_count           Int      @default(1)
  is_returning          Boolean  @default(false)
  country_code          String?
  country_name          String?
  region_name           String?
  city_name             String?
  first_referrer        String?
  first_landing_url     String?
  last_landing_url      String?
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  assistant WebsiteAssistant @relation(fields: [assistant_id], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  sessions WebsiteVisitSession[]

  @@unique([assistant_id, visitor_fingerprint])
  @@index([tenant_id])
  @@index([last_seen_at])
}

model WebsiteVisitSession {
  id                    String   @id @default(uuid())
  assistant_id          String
  visitor_id            String
  tenant_id             String
  session_token         String   @unique
  started_at            DateTime @default(now())
  ended_at              DateTime?
  referrer_url          String?
  landing_url           String?
  entry_path            String?
  utm_source            String?
  utm_medium            String?
  utm_campaign          String?
  utm_term              String?
  utm_content           String?
  browser_name          String?
  device_type           String?
  os_name               String?
  ip_hash               String?
  ip_country_code       String?
  ip_country_name       String?
  event_count           Int      @default(0)
  chat_opened           Boolean  @default(false)
  chat_started          Boolean  @default(false)
  lead_captured         Boolean  @default(false)
  handoff_requested     Boolean  @default(false)
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  assistant WebsiteAssistant @relation(fields: [assistant_id], references: [id], onDelete: Cascade)
  visitor WebsiteVisitor @relation(fields: [visitor_id], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  events WebsiteEvent[]

  @@index([tenant_id])
  @@index([assistant_id])
  @@index([started_at])
}

model WebsiteEvent {
  id                 String   @id @default(uuid())
  tenant_id          String
  assistant_id       String
  visitor_id         String?
  session_id         String
  event_type         String   // page_view | widget_open | chat_started | lead_capture | cta_click | handoff_request
  page_url           String?
  page_path          String?
  event_value        String?
  metadata           String?
  occurred_at        DateTime @default(now())

  tenant Tenant @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  assistant WebsiteAssistant @relation(fields: [assistant_id], references: [id], onDelete: Cascade)
  session WebsiteVisitSession @relation(fields: [session_id], references: [id], onDelete: Cascade)

  @@index([tenant_id])
  @@index([assistant_id, occurred_at])
  @@index([event_type])
}
```

### Backend API Endpoints

- `POST /widget/session/:publicEmbedKey`
  - Creates or resumes a visitor session

- `POST /widget/events/:publicEmbedKey`
  - Records page views and intent events

- `GET /api/website-assistant/:id/analytics/summary`
- `GET /api/website-assistant/:id/analytics/visitors`
- `GET /api/website-assistant/:id/analytics/events`

### UI Pages

#### Dashboard

- Visitors list page
- Live visitor feed page
- Visitor detail page
- Funnel analytics page

#### Mobile

- Visitor alerts inbox
- Visitor detail quick-view
- Live activity summary cards

## Phase 4: Notifications And Handoff Workflows

### Goals

- Notify tenants about new visitors and important events
- Create fast human handoff flows
- Reuse existing mobile notification infrastructure

### Data Requirements

No new core tables are required if existing `AppNotification` and `FcmToken` are reused.

Optional settings model extension:

```prisma
model WebsiteAssistantAlertPreference {
  id                         String   @id @default(uuid())
  assistant_id               String
  user_id                    String
  notify_new_visitor         Boolean  @default(true)
  notify_chat_started        Boolean  @default(true)
  notify_lead_captured       Boolean  @default(true)
  notify_handoff_requested   Boolean  @default(true)
  created_at                 DateTime @default(now())
  updated_at                 DateTime @updatedAt

  @@unique([assistant_id, user_id])
}
```

### Notification Types

Add or reuse app-notification types:

- `website_new_visitor`
- `website_chat_started`
- `website_lead_captured`
- `website_handoff_requested`

### Backend API Endpoints

- `GET /api/website-assistant/:id/alerts/preferences`
- `PUT /api/website-assistant/:id/alerts/preferences`
- `POST /api/website-assistant/:id/handoff/:sessionId`

### Mobile UX

- Notification opens directly into the visitor session detail when possible
- New visitor push body format:
  - `New visitor on <site name>`
  - `Returning visitor from <country> opened your assistant`

## Phase 5: Promo Plan And Trial Billing Flow

### Goals

- Add a new promo plan
- Provide a 7-day free trial
- Convert trial users into a paid subscription flow

### Database Changes

Existing `Plan` and `Subscription` can support most of this, but trial behavior needs clearer status modeling.

Recommended changes:

```prisma
model Subscription {
  id                          String   @id @default(uuid())
  tenant_id                   String   @unique
  plan_tier                   String
  status                      String
  trial_started_at            DateTime?
  trial_ends_at               DateTime?
  trial_converted_at          DateTime?
  promo_offer_code            String?
  current_period_start        DateTime
  current_period_end          DateTime
  conversations_used          Int      @default(0)
  conversations_limit         Int
  overage_cost_kobo           Int      @default(0)
  paystack_plan_code          String?
  paystack_subscription_code  String?
  created_at                  DateTime @default(now())
  updated_at                  DateTime @updatedAt
}
```

### Plan Record

Create a `promo` plan in `Plan`.

Suggested behavior:

- Lower entry price than starter after trial ends
- Limited but useful feature set
- Can later upgrade into starter or growth

### Backend API Endpoints

- `GET /api/plans/public`
  - Include promo plan when active

- `POST /api/auth/register`
  - Accept `planTier: promo`

- `POST /api/subscription/trial/start`
- `GET /api/subscription/trial/status`
- `POST /api/subscription/trial/convert`

### Dashboard UI Pages

- Registration plan cards
- Trial countdown banner
- Trial conversion modal
- Subscription page upgrade CTA

## Phase 6: Public Funnel And Diagnostic Questionnaire

### Goals

- Replace hard direct signup pressure with guided qualification
- Route users into the right use case
- Capture lead intent before account creation

### Funnel Structure

1. Public homepage CTA
2. Diagnostic questionnaire
3. Personalized recommendation screen
4. Branch to signup, demo booking, or guided onboarding
5. Prefill dashboard onboarding with selected use case

### Database Models

```prisma
model FunnelLead {
  id                    String   @id @default(uuid())
  full_name             String?
  email                 String?
  phone                 String?
  company_name          String?
  website_url           String?
  use_case              String?  // whatsapp_automation | website_support
  industry              String?
  monthly_inquiries     String?
  current_channel       String?
  recommended_plan_tier String?
  source_page           String?
  utm_source            String?
  utm_medium            String?
  utm_campaign          String?
  status                String   @default("new")
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  @@index([created_at])
  @@index([use_case])
}
```

### Backend API Endpoints

- `POST /api/funnel/lead`
- `POST /api/funnel/recommendation`
- `GET /api/funnel/config`

### UI Pages

#### Public Site

- Updated homepage hero CTA block
- Questionnaire page or modal
- Recommendation results page
- Offer page for 7-day promo trial

#### Dashboard

- Onboarding welcome step accepts selected use case
- Onboarding path branches between WhatsApp-first and website-assistant-first setup

## Exact Public Funnel Copy

## Homepage Hero Copy

### Primary Headline

Add an AI assistant to your website or automate your customer chats in 7 days.

### Supporting Copy

Raven Business Assistant helps you handle customer questions, capture leads, automate support, and stay online 24/7 across your website and messaging channels.

### Primary CTA

Try RBA Free for 7 Days

### Secondary CTA

Find the Right Setup for My Business

### Trust Strip

- No credit card required to begin
- Guided setup for WhatsApp or website support
- Mobile alerts when visitors and leads come in

## Questionnaire Intro Copy

### Title

Let us recommend the best Raven setup for your business.

### Subtitle

Answer 6 quick questions and we will guide you to the right path: automate your WhatsApp messages, launch a website support assistant, or combine both.

### CTA

Start the 2-minute assessment

## Questionnaire Flow

### Question 1: Main Goal

What do you want to improve first?

Options:

- I want to automate WhatsApp customer messages
- I want a customer support assistant on my website
- I want both
- I am not sure yet

### Question 2: Business Type

What kind of business do you run?

Options:

- Retail or ecommerce
- Hospitality or restaurant
- Professional services
- Real estate
- Healthcare
- Education
- Other

### Question 3: Current Inquiry Volume

How many customer questions do you handle each week?

Options:

- Fewer than 50
- 50 to 200
- 200 to 1,000
- More than 1,000

### Question 4: Current Channel Mix

Where do most customer questions come from today?

Options:

- WhatsApp
- Website
- Instagram or Facebook
- Phone calls
- A mix of channels

### Question 5: Website Readiness

Do you already have a website?

Options:

- Yes, and I want to add support chat to it
- Yes, but it does not get many leads yet
- No, I mainly use WhatsApp and social media
- I am building one now

### Question 6: Contact Capture

Where should we send your recommended setup?

Fields:

- Full name
- Business name
- Email address
- Phone number
- Website URL

## Recommendation Logic

### Branch A: WhatsApp Automation

Criteria:

- Q1 is WhatsApp-first
- No website or low website dependence

Result Title:

Your best starting point is WhatsApp automation.

Result Copy:

Start by automating FAQs, lead qualification, and customer replies on WhatsApp. You can add a website assistant later without rebuilding your setup.

Primary CTA:

Start Your 7-Day Free Trial

Secondary CTA:

See How WhatsApp Automation Works

### Branch B: Website Support Assistant

Criteria:

- Q1 is website support
- Existing website present

Result Title:

Your best starting point is a website customer support assistant.

Result Copy:

Launch a branded chat assistant on your site, train it on your FAQs and products, and get mobile alerts when visitors engage.

Primary CTA:

Build My Website Assistant Free

Secondary CTA:

See a Live Demo

### Branch C: Combined Setup

Criteria:

- Q1 is both
- Higher inquiry volume or mixed channels

Result Title:

You are ready for a combined support setup.

Result Copy:

Use Raven to handle both website and messaging inquiries from one system, with shared knowledge, centralized analytics, and mobile notifications.

Primary CTA:

Start Free and Set Up Both

Secondary CTA:

Book a Guided Setup Call

### Branch D: Unsure

Criteria:

- Q1 is unsure

Result Title:

Start small, then expand as you grow.

Result Copy:

Most businesses begin with either WhatsApp automation or a website support assistant, then expand after they see traction. We will help you choose the fastest win.

Primary CTA:

Start With the Promo Trial

Secondary CTA:

Talk to an RBA Specialist

## Exact Offer Copy For Promo Trial

### Headline

Try Raven Business Assistant free for 7 days.

### Subheadline

Launch faster, automate customer support, and see real visitor and lead activity before you commit.

### Included Bullets

- Guided setup for WhatsApp automation or website support
- AI assistant trained on your FAQs and products
- Mobile push alerts for visitor and chat activity
- Promo plan access for your first launch window

### Primary CTA

Start My Free 7-Day Trial

### Secondary CTA

See What Happens During Setup

## Dashboard Onboarding Copy And Branching

## New Welcome Step

### Title

What are you launching first?

### Subtitle

We will tailor your onboarding so you can get value faster.

### Option Cards

#### Card 1

Title:

Automate WhatsApp Messages

Body:

Set up your business profile, connect WhatsApp, train your FAQs, and start responding automatically.

CTA:

Choose WhatsApp Setup

#### Card 2

Title:

Create a Website Support Assistant

Body:

Customize your site widget, add your domain, train the assistant, and paste the embed code into your website header.

CTA:

Choose Website Assistant Setup

#### Card 3

Title:

Set Up Both

Body:

Build one shared knowledge base for website and messaging channels, then manage alerts and performance in one place.

CTA:

Choose Combined Setup

## Dashboard Onboarding Paths

### WhatsApp Path

1. Welcome
2. Trial or payment confirmation
3. Business profile
4. WhatsApp credentials
5. FAQ training
6. Test conversation
7. Done

### Website Assistant Path

1. Welcome
2. Trial or payment confirmation
3. Business profile
4. Website assistant appearance
5. Domain verification
6. Knowledge training
7. Embed code installation
8. Live test
9. Done

### Combined Path

1. Welcome
2. Trial or payment confirmation
3. Business profile
4. Shared knowledge base
5. WhatsApp setup
6. Website assistant setup
7. Notification preferences
8. Live test
9. Done

## Implementation Risks And Dependencies

### Risk 1: Split Bot Storage

If bot config remains split between theme JSON and `TenantBotConfig`, website assistant settings will fragment quickly.

Mitigation:

- Complete Phase 1 before assistant feature work

### Risk 2: Hardcoded Plan Drift

If clients keep local plan arrays, promo pricing will diverge between registration, upgrade, and mobile surfaces.

Mitigation:

- Complete API-driven plan retrieval before promo-plan rollout

### Risk 3: Visitor Privacy And Consent

IP and visitor analytics require policy coverage and retention controls.

Mitigation:

- Add privacy copy, retention windows, and consent-aware tracking rules before production rollout

### Risk 4: Domain Abuse

Without verification, a tenant could embed or attempt to train against domains they do not control.

Mitigation:

- Require domain allowlisting and verification before production assistant activation

## Recommended Delivery Order

1. Phase 1 normalization and API contracts
2. Phase 2 assistant model and embed runtime
3. Phase 3 visitor analytics and reporting
4. Phase 4 notifications and handoff workflows
5. Phase 5 promo plan and trial conversion
6. Phase 6 public funnel and adaptive onboarding

## Phase 1 Implementation Checklist

- Add `enabled` to `TenantBotConfig`
- Add canonical fallback behavior to tenant bot-config reads
- Move tenant UI bot settings to `api/bot-config`
- Add `GET /api/plans/public`
- Add tenant active-plan retrieval for upgrade flows
- Replace hardcoded client plan arrays in registration and upgrade surfaces
- Preserve admin plan management as the single editing surface

## Phase 1 Execution Checklist

This section converts the Phase 1 tickets into an execution-ready checklist with target files and endpoint owners.

## Execution Rules

- Do not add new bot settings to `Tenant.theme`
- Keep `Tenant.theme` fallback behavior only for migration safety
- Do not duplicate plan metadata in dashboard or mobile once the APIs are live
- Preserve admin console as the only plan editing surface

## P1-01: Add Structured Bot Enablement To Prisma

Status:

- ✅ Done

Owner:

- Backend

Primary endpoint owner:

- `GET /api/bot-config`
- `PUT /api/bot-config`

Target files:

- `backend/prisma/schema.prisma`
- `backend/apps/api/src/bot-config.controller.ts`
- `backend/apps/worker/messaging/ai-message.processor.ts`

Checklist:

- Add `enabled Boolean @default(false)` to `TenantBotConfig`
- Ensure Prisma client generation is updated after schema change
- Confirm AI runtime can safely consume the canonical config shape after the field is introduced

Done when:

- Bot enablement is modeled in `TenantBotConfig`
- Structured config can fully represent bot activation plus prompt behavior

## P1-02: Canonicalize `GET /api/bot-config`

Status:

- ✅ Done

Owner:

- Backend

Primary endpoint owner:

- `backend/apps/api/src/bot-config.controller.ts`

Target files:

- `backend/apps/api/src/bot-config.controller.ts`
- `backend/apps/api/src/tenant-keys.controller.ts`
- `backend/apps/worker/messaging/ai-message.processor.ts`

Checklist:

- Update `GET /api/bot-config` to return canonical structured config
- If `TenantBotConfig.system_prompt` is empty for a tenant, fallback to legacy `Tenant.theme.BOT_SYSTEM_PROMPT`
- If `TenantBotConfig.enabled` is missing during migration rollout, fallback to legacy `Tenant.theme.BOT_ENABLED`
- Keep the response shape stable for tenant-facing clients

Done when:

- Tenant clients can fetch one canonical bot-config object
- Older tenants still get correct prompt and enablement behavior during migration

## P1-03: Canonicalize `PUT /api/bot-config`

Status:

- ✅ Done

Owner:

- Backend

Primary endpoint owner:

- `backend/apps/api/src/bot-config.controller.ts`

Target files:

- `backend/apps/api/src/bot-config.controller.ts`
- `backend/apps/api/src/tenant-keys.controller.ts`

Checklist:

- Update `PUT /api/bot-config` to own `enabled`, `system_prompt`, `personality_tone`, `fallback_reply`, `about_reply_text`, `about_image_url`, `about_cta_url`, `about_cta_label`, and `escalation_message`
- Stop writing `BOT_ENABLED` and `BOT_SYSTEM_PROMPT` from tenant-facing bot setup flows
- Keep `api/settings/bot` either deprecated or compatibility-only until all clients move

Done when:

- All new bot setting writes land in `TenantBotConfig`
- No Phase 1 client writes new bot values into `Tenant.theme`

Audit note:

- Partial canonical bot-config writes were updated to preserve untouched fields instead of resetting them to defaults or nulls

## P1-04: Add Public Active Plans API

Status:

- ✅ Done

Owner:

- Backend

Primary endpoint owner:

- New controller or billing-owned controller under the API app

Target files:

- `backend/apps/api/src/billing.module.ts`
- `backend/apps/api/src/app.module.ts`
- `backend/libs/billing/subscriptions.service.ts`
- One new or existing plan controller file in `backend/apps/api/src/`

Checklist:

- Add `GET /api/plans/public`
- Return only active plans sorted by `sort_order`
- Include tier, name, description, price, conversation limit, overage, features, and active state
- Keep response free of admin-only or billing-provider fields

Done when:

- Public registration and funnel pages can render plan cards without local constants

## P1-05: Add Tenant Active Plans API

Status:

- ✅ Done

Owner:

- Backend

Primary endpoint owner:

- New or existing tenant billing controller

Target files:

- `backend/apps/api/src/billing.module.ts`
- `backend/apps/api/src/app.module.ts`
- `backend/libs/billing/subscriptions.service.ts`
- One new or existing plan controller file in `backend/apps/api/src/`

Checklist:

- Add `GET /api/plans`
- Require tenant auth
- Return active plans sorted by `sort_order`
- Optionally include `currentPlanTier` derived from the tenant subscription

Done when:

- Dashboard and mobile subscription or upgrade flows can use backend plan metadata instead of local arrays

## P1-06: Add Bot Config Backfill Or Compatibility Migration

Status:

- ✅ Done

Owner:

- Backend

Primary endpoint owner:

- Migration utility, not a user-facing endpoint

Target files:

- `backend/prisma/` migration files
- `backend/prisma/seed*.ts` or a dedicated migration utility file
- `backend/apps/api/src/bot-config.controller.ts`

Checklist:

- Backfill `TenantBotConfig.system_prompt` from legacy theme prompt when missing
- Backfill `TenantBotConfig.enabled` from legacy theme bot enablement when missing
- Make the migration safe to rerun

Done when:

- Existing tenants retain behavior after Phase 1 rollout without manual repair

## P1-07: Move Mobile Bot Screen To Canonical Bot Config API

Status:

- ✅ Done

Owner:

- Mobile

Primary endpoint owner:

- `GET /api/bot-config`
- `PUT /api/bot-config`

Target files:

- `mobile/src/screens/BotsScreen.tsx`
- `mobile/src/lib/api.ts` if request helpers need method or shape updates

Checklist:

- Replace reads from `/api/settings/bot` with `/api/bot-config`
- Replace writes from `/api/settings/bot` with `/api/bot-config`
- Keep shimmer-first loading and existing save or toggle feedback

Done when:

- Mobile bot settings no longer depend on the legacy theme-backed endpoint

## P1-08: Move Dashboard Registration To Public Plans API

Status:

- ✅ Done

Owner:

- Dashboard

Primary endpoint owner:

- `GET /api/plans/public`

Target files:

- `dashboard/app/register/page.tsx`
- Any plan display helper colocated with registration

Checklist:

- Remove hardcoded registration plan array
- Fetch plans from `/api/plans/public`
- Render loading, error, and retry states inside the mounted shell
- Preserve the existing registration submission payload shape

Done when:

- Registration plan cards come entirely from backend data

## P1-09: Move Dashboard Upgrade Flow To Tenant Plans API

Status:

- ✅ Done

Owner:

- Dashboard

Primary endpoint owner:

- `GET /api/plans`

Target files:

- `dashboard/components/PlanUpgradeModal.tsx`
- `dashboard/app/subscription/page.tsx`

Checklist:

- Remove hardcoded upgrade plan array
- Fetch active plans from `/api/plans`
- Use backend plan metadata for current-plan comparison where possible
- Preserve async disable, loading text, and error handling on upgrade actions

Done when:

- Dashboard upgrade UI reflects admin-managed plans without hardcoded pricing data

## P1-10: Reduce Mobile Subscription Plan Duplication

Status:

- ✅ Done

Owner:

- Mobile

Primary endpoint owner:

- `GET /api/plans`

Target files:

- `mobile/src/screens/SubscriptionScreen.tsx`

Checklist:

- Replace local plan-feature duplication where feasible with backend plan metadata
- Keep current subscription status and usage rendering intact
- Preserve loading and empty-state behavior

Done when:

- Mobile subscription display can reflect backend-managed plan changes with minimal client-only constants

## P1-11: Preserve Admin Console As Plan Editing Source Of Truth

Status:

- ✅ Done

Owner:

- Admin console and backend

Primary endpoint owner:

- Existing admin plan management endpoints

Target files:

- `admin-console/app/admin/plans/page.tsx`
- Existing admin plan controller files in `backend/apps/api/admin/`

Checklist:

- Confirm Phase 1 public and tenant plan retrieval APIs are read-only consumers of the `Plan` model
- Confirm admin console remains the only UI that creates, updates, activates, deactivates, or reorders plans

Done when:

- There is no competing plan-editing path in dashboard or mobile

## Phase 1 File Map Summary

### Backend

- `backend/prisma/schema.prisma`
- `backend/apps/api/src/bot-config.controller.ts`
- `backend/apps/api/src/tenant-keys.controller.ts`
- `backend/apps/api/src/billing.module.ts`
- `backend/apps/api/src/app.module.ts`
- `backend/libs/billing/subscriptions.service.ts`
- One new or existing plan controller in `backend/apps/api/src/`
- Optional migration utility under `backend/prisma/`

### Dashboard

- `dashboard/app/register/page.tsx`
- `dashboard/components/PlanUpgradeModal.tsx`
- `dashboard/app/subscription/page.tsx`

### Mobile

- `mobile/src/screens/BotsScreen.tsx`
- `mobile/src/screens/SubscriptionScreen.tsx`
- `mobile/src/lib/api.ts` if request helper changes are needed

### Admin Console

- `admin-console/app/admin/plans/page.tsx`

## Phase 1 Endpoint Ownership Summary

- `GET /api/bot-config`: backend bot-config controller
- `PUT /api/bot-config`: backend bot-config controller
- `GET /api/plans/public`: backend billing or plans read controller
- `GET /api/plans`: backend tenant billing or plans read controller
- Admin plan write endpoints: existing admin billing or plans controllers only

## Phase 1 Validation Checklist

- Done: Prisma schema compiles with `TenantBotConfig.enabled`
- Done: Existing tenants with legacy bot settings still load usable bot config
- Done: Registration page renders API-driven plans only
- Done: Plan upgrade modal renders API-driven plans only
- Done: Mobile bot screen uses canonical bot-config APIs only
- Done: Mobile subscription screen no longer depends on stale hardcoded pricing definitions
- Done: Admin plan changes are visible in registration and upgrade flows without client code edits

Validation note:

- Focused backend controller regression tests now cover canonical bot-config legacy fallback, partial-write preservation, public plans payload shape, and tenant `currentPlanTier` resolution

## Delivery Tickets By Surface

This section translates the phased spec into delivery-ready tickets grouped by owning surface.

Ticket format:

- ID
- Scope
- Dependencies
- Deliverables
- Acceptance criteria

## Backend Tickets

### BE-01: Canonicalize Tenant Bot Config

Scope:

- Make `TenantBotConfig` the canonical store for tenant bot settings
- Add structured ownership for bot enablement
- Keep a compatibility fallback for legacy theme values during migration

Dependencies:

- None

Deliverables:

- Add `enabled` to `TenantBotConfig`
- Update `GET /api/bot-config` to return canonical config with legacy fallback
- Update `PUT /api/bot-config` to own all tenant bot fields
- Stop writing new bot settings into `Tenant.theme`

Acceptance criteria:

- Tenant-facing clients can read and write bot settings without using legacy theme bot keys
- Existing tenants with legacy bot prompt values still receive correct behavior
- AI runtime reads remain compatible during migration

### BE-02: Public And Tenant Active Plan APIs

Scope:

- Expose a reusable active-plan API for public signup and tenant upgrade surfaces

Dependencies:

- None

Deliverables:

- Add `GET /api/plans/public`
- Add `GET /api/plans`
- Return active plans sorted by `sort_order`
- Include plan features, price, overage, and tier metadata in a stable contract

Acceptance criteria:

- Public clients can render plan cards without hardcoded plan definitions
- Tenant upgrade flows can render active plan options from backend data
- Promo plan can later be added without client code duplication

### BE-03: Bot Config Migration Utility

Scope:

- Backfill structured bot config from legacy theme values for existing tenants

Dependencies:

- BE-01

Deliverables:

- Add a one-time migration or idempotent backfill script
- Populate `TenantBotConfig.system_prompt` and `enabled` from legacy theme keys when present

Acceptance criteria:

- Existing tenants keep their bot prompt and activation behavior after Phase 1 rollout
- Migration can be rerun safely without duplicate or destructive updates

### BE-04: Website Assistant Core Prisma Models

Status:

- ✅ Done

Scope:

- Add foundational assistant and domain models for web embed support

Dependencies:

- BE-01 recommended first

Deliverables:

- Add `WebsiteAssistant`
- Add `WebsiteAssistantDomain`
- Add `WebsiteKnowledgeSource`
- Add migrations and Prisma generation updates

Acceptance criteria:

- A tenant can own one or more website assistants
- Each assistant can own verified domains and knowledge-source records

Validation note:

- Done: Prisma schema validation passed after adding `WebsiteAssistant`, `WebsiteAssistantDomain`, `WebsiteKnowledgeSource`, `WebsiteVisitor`, `WebsiteVisitSession`, and `WebsiteEvent`

### BE-05: Website Assistant Management APIs

Status:

- ✅ Done

Scope:

- Add tenant APIs for assistant setup and domain management

Dependencies:

- BE-04

Deliverables:

- Add list, create, get, update assistant APIs
- Add domain add and verify APIs
- Add embed-config retrieval API for public widget runtime

Acceptance criteria:

- Dashboard can fully manage assistant setup without direct DB coupling
- Widget runtime can fetch assistant config by public embed key

Validation note:

- Done: backend controller coverage now includes assistant create flow, embed code generation, domain normalization, and token-based domain verification

### BE-06: Widget Session And Event Ingestion

Status:

- ✅ Done

Scope:

- Accept session bootstrap, event tracking, and chat runtime requests from embedded sites

Dependencies:

- BE-04
- BE-05

Deliverables:

- Add widget session bootstrap endpoint
- Add widget event ingestion endpoint
- Add widget message endpoint
- Validate allowed domains against assistant domain records

Acceptance criteria:

- Embedded sites can open tracked sessions and record events
- Requests from unverified domains are rejected

Validation note:

- Done: public widget controller coverage now includes verified-domain config reads, unverified-domain rejection, and session bootstrap for embedded sites

### BE-07: Visitor Analytics Models And Queries

Status:

- ✅ Done

Scope:

- Add explicit visitor, session, and event analytics storage plus reporting queries

Dependencies:

- BE-06

Deliverables:

- Add `WebsiteVisitor`
- Add `WebsiteVisitSession`
- Add `WebsiteEvent`
- Add summary, visitor list, and event list analytics endpoints

Acceptance criteria:

- Tenants can distinguish new and returning visitors
- Analytics endpoints support dashboard and mobile reporting needs

Validation note:

- Done: backend analytics endpoints now return assistant-level visitor summary, visitor detail listings, and event history for dashboard use

### BE-08: Website Visitor Notifications

Status:

- ✅ Done

Scope:

- Reuse app notifications and mobile push infrastructure for visitor alerts

Dependencies:

- BE-06
- BE-07

Deliverables:

- Add website notification types
- Trigger app notification creation and push dispatch for selected visitor events
- Add alert preference API if per-user assistant alert preferences are implemented

Acceptance criteria:

- Mobile devices receive push alerts for configured visitor events
- In-app notifications are created for the same events

### BE-09: Promo Plan And Trial Billing Support

Status:

- ✅ Done

Scope:

- Add promo plan, trial lifecycle, and conversion support in billing APIs

Dependencies:

- BE-02

Deliverables:

- Extend subscription model for trial fields
- Support `promo` plan retrieval in plan APIs
- Add trial start, status, and convert endpoints
- Update registration and billing logic to support promo onboarding

Acceptance criteria:

- New promo users can start a 7-day trial
- Trial status is queryable by dashboard flows
- Promo plan behaves consistently across signup and subscription views

### BE-10: Funnel Lead Capture APIs

Scope:

- Store diagnostic questionnaire results and recommendation outcomes

Dependencies:

- None

Deliverables:

- Add `FunnelLead` model
- Add lead submission API
- Add recommendation API or recommendation mapping service
- Add optional admin notification hook for high-intent leads

Acceptance criteria:

- Public funnel can save lead answers and recommendation results
- Dashboard onboarding can consume selected use case context later

## Dashboard Tickets

### DB-01: Registration Uses API-Driven Plans

Scope:

- Replace hardcoded plan cards on registration with public plan API data

Dependencies:

- BE-02

Deliverables:

- Fetch `GET /api/plans/public`
- Render loading, error, and retry states in the mounted shell
- Preserve existing registration submission contract

Acceptance criteria:

- Registration page renders backend plan data only
- Plan changes in admin do not require dashboard code edits

### DB-02: Subscription Upgrade UI Uses Tenant Plan API

Scope:

- Replace hardcoded upgrade plan definitions with tenant plan API data

Dependencies:

- BE-02

Deliverables:

- Update plan upgrade modal
- Update subscription summary where plan metadata is duplicated
- Preserve async button behavior and confirmation states

Acceptance criteria:

- Upgrade surface reflects backend-managed active plans
- Promo plan can appear without a dashboard code patch

### DB-03: Dashboard Bot Settings Use Canonical API

Scope:

- Move any tenant dashboard bot settings reads and writes onto `api/bot-config`

Dependencies:

- BE-01

Deliverables:

- Remove dashboard reliance on legacy `api/settings/bot` path where applicable
- Use canonical structured bot config shape

Acceptance criteria:

- Dashboard bot settings work without theme-based bot writes

### DB-04: Website Assistant Setup Surface

Scope:

- Build the primary tenant website-assistant configuration flow in dashboard

Dependencies:

- BE-05

Deliverables:

- Website assistant overview page
- Appearance and behavior page
- Domain verification page
- Knowledge sources page
- Embed code page with preview and copy action

Acceptance criteria:

- A tenant can fully configure an assistant in dashboard end-to-end
- All async actions have loading, error, and retry states

### DB-05: Visitor Analytics Dashboard

Scope:

- Surface website visitors, sessions, analytics, and event history in dashboard

Dependencies:

- BE-07

Deliverables:

- Visitor summary cards
- Visitor list view
- Visitor detail view
- Funnel analytics view

Acceptance criteria:

- Tenant operators can see visitor volume, returning status, geography, and high-intent actions

### DB-06: Dashboard Onboarding Branching

Scope:

- Add the new onboarding welcome step and split onboarding paths by use case

Dependencies:

- BE-10
- BE-09 if promo trial is included in the same release

Deliverables:

- New welcome step with three route cards
- Website-assistant-first path
- Combined setup path
- Prefill from funnel recommendation where available

Acceptance criteria:

- A user can choose WhatsApp, website assistant, or combined setup
- Onboarding path persists and resumes correctly

### DB-07: Trial And Promo UX

Scope:

- Reflect promo trial status and conversion path inside dashboard

Dependencies:

- BE-09

Deliverables:

- Trial countdown banner
- Trial conversion modal or CTA card
- Promo plan labeling in registration and subscription views

Acceptance criteria:

- Trial users can clearly see remaining trial time and the next action required

## Mobile Tickets

### MO-01: Mobile Bot Screen Uses Canonical API

Scope:

- Move mobile bot screen to canonical structured bot-config API

Dependencies:

- BE-01

Deliverables:

- Update reads from `GET /api/bot-config`
- Update writes to `PUT /api/bot-config`
- Preserve current loading, save, and toggle interactions

Acceptance criteria:

- Mobile bot settings are no longer coupled to legacy theme-based bot keys

### MO-02: Mobile Subscription Plan Metadata Uses API

Scope:

- Remove hardcoded plan-feature duplication where feasible in mobile subscription surfaces

Dependencies:

- BE-02

Deliverables:

- Fetch active plan metadata for subscription display
- Render server-backed plan details and current-plan comparison where useful

Acceptance criteria:

- Mobile subscription screen reflects backend plan definitions

### MO-03: Website Visitor Push Alerts

Scope:

- Consume website visitor event pushes in mobile notifications UX

Dependencies:

- BE-08

Deliverables:

- Add website visitor notification mapping in notification list UI
- Support deep-link entry into visitor detail or activity context

Acceptance criteria:

- Website visitor alerts are readable and actionable in the mobile app

### MO-04: Visitor Activity Views

Scope:

- Add mobile pages for visitor activity, recent alerts, and assistant performance snapshots

Dependencies:

- BE-07
- BE-08

Deliverables:

- Visitor alerts inbox improvements
- Assistant summary cards
- Visitor detail quick view

Acceptance criteria:

- A mobile operator can understand live visitor activity without opening the dashboard

### MO-05: Assistant Alert Preferences

Scope:

- Allow mobile users to configure which website visitor events trigger push alerts

Dependencies:

- BE-08 if preferences are implemented

Deliverables:

- Alert preference screen or settings block
- Toggle states for new visitor, chat started, lead captured, and handoff requested

Acceptance criteria:

- Preference changes persist and affect future push delivery behavior

## Public Site Tickets

### PS-01: Homepage Funnel CTA Update

Scope:

- Replace direct hard-only signup emphasis with a guided funnel entry point

Dependencies:

- None

Deliverables:

- Update hero copy and CTA hierarchy in `public_html`
- Add the new primary and secondary CTA copy from this spec

Acceptance criteria:

- Public homepage clearly offers both the free trial and guided recommendation path

### PS-02: Diagnostic Questionnaire Experience

Scope:

- Build the 6-question assessment that routes users by use case

Dependencies:

- BE-10

Deliverables:

- Questionnaire UI in public site
- Step progression, validation, and submission
- Loading, error, and retry states

Acceptance criteria:

- Visitors can complete the questionnaire and receive a recommendation without account creation

### PS-03: Recommendation Results Page

Scope:

- Show result-specific messaging, offer framing, and next steps

Dependencies:

- PS-02

Deliverables:

- Branch result views for WhatsApp, website support, combined, and unsure
- CTA routing to signup, demo, or offer pages

Acceptance criteria:

- Recommendation result copy matches the logic and wording defined in this spec

### PS-04: Promo Trial Offer Page

Scope:

- Add a dedicated promo-offer landing page tied to the 7-day trial

Dependencies:

- BE-09

Deliverables:

- Offer page with exact headline, subheadline, benefit bullets, and CTA copy
- Routing into promo signup path

Acceptance criteria:

- Promo plan visitors can begin the intended trial flow from the public site

### PS-05: Public Lead And Attribution Persistence

Scope:

- Preserve questionnaire context, recommendation, and UTM data into signup and onboarding

Dependencies:

- BE-10

Deliverables:

- Persist use-case recommendation to lead records
- Pass selected intent into signup or onboarding entry

Acceptance criteria:

- A visitorâ€™s public funnel context is available for later onboarding personalization

## Suggested Execution Sequence By Ticket

### Release 1: Phase 1 Foundation

- BE-01
- BE-02
- BE-03
- DB-01
- DB-02
- DB-03
- MO-01
- MO-02

### Release 2: Assistant Setup

- BE-04
- BE-05
- DB-04

### Release 3: Analytics And Alerts

- BE-06
- BE-07
- BE-08
- DB-05
- MO-03
- MO-04
- MO-05

### Release 4: Promo And Funnel

- BE-09
- BE-10
- DB-06
- DB-07
- PS-01
- PS-02
- PS-03
- PS-04
- PS-05

## Ticket Ownership Notes

- Backend owns data contracts, persistence, notification triggering, and public widget runtime validation
- Dashboard owns the primary tenant setup and analytics surfaces
- Mobile owns alert consumption and lightweight operator workflows
- Public site owns acquisition messaging, questionnaire UX, recommendation pages, and offer-page presentation







