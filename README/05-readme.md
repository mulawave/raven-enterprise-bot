# Raven Enterprise Platform

**Multi-tenant WhatsApp Business automation platform** — AI chatbots, live agent handoff, order management, payments, mobile app, and a full admin console. Ready to deploy under your own domain.

---

## What's Inside

| Component | Technology | Description |
|---|---|---|
| **Backend API** | NestJS + Prisma + PostgreSQL | REST API, WebSocket, background workers, 35+ models |
| **Tenant Dashboard** | Next.js + Tailwind CSS | Business owner panel — chat, orders, settings, analytics |
| **Admin Console** | Next.js + Tailwind CSS | Platform operator panel — tenants, plans, KYC, config |
| **Mobile App** | Expo React Native | Staff app — conversations, notifications, orders |
| **Deploy Scripts** | PowerShell + PM2 | One-command production deployment |

---

## Key Features

- **WhatsApp Business API** — Meta Cloud API integration, automated flows
- **AI Chatbot** — GPT-powered with configurable tone and system prompts per tenant
- **Smart Handoff** — Bot detects dead ends and routes to humans with context
- **Hidden FAQ Learning** — Conversations auto-generate FAQ entries
- **Order Management** — Catalog, cart, checkout, payment, PDF receipts via WhatsApp
- **Payments** — Paystack + Flutterwave with full audit trail
- **Push Notifications** — Firebase Cloud Messaging (web + mobile)
- **Multi-tenant** — Complete data isolation, per-tenant billing and limits
- **Admin Console** — Tenant management, KYC verification, plan assignment
- **Dark/Light Theme** — Professional UI across all frontends
- **Mobile App** — Play Store ready, works on 2G/3G networks
- **GDPR Ready** — Consent tracking, data deletion requests

---

## Quick Start

```bash
# 1. Clone and install
cd backend && npm install && cd ..
cd dashboard && npm install && cd ..
cd admin-console && npm install && cd ..

# 2. Configure
cp env.example .env   # Edit with your database, Redis, and API keys

# 3. Database setup
cd backend
npx prisma migrate deploy --schema=prisma/schema.prisma
npx prisma generate --schema=prisma/schema.prisma
npx prisma db seed
cd ..

# 4. Build
cd backend && npm run build:all && cd ..
cd dashboard && npm run build && cd ..
cd admin-console && npm run build && cd ..

# 5. Start
pm2 start deploy/ecosystem.config.js
```

---

## Architecture

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Dashboard   │   │ Admin Console │   │  Mobile App   │
│  (Next.js)    │   │  (Next.js)    │   │  (Expo RN)    │
│   :4011       │   │   :4012       │   │               │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                   │
       └──────────┬───────┘───────────────────┘
                  ▼
          ┌──────────────┐
          │  Backend API  │
          │  (NestJS)     │
          │   :4010       │
          └──────┬───────┘
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
┌────────────┐     ┌────────────┐
│ PostgreSQL │     │   Redis    │
│   :5432    │     │   :6379    │
└────────────┘     └────────────┘
```

---

## Directory Structure

```
backend/           NestJS API + worker (Prisma, queues, WhatsApp, payments)
dashboard/         Next.js tenant dashboard (chat, orders, settings)
admin-console/     Next.js super-admin panel (tenants, plans, KYC, config)
mobile/            Expo React Native app for tenant users
deploy/            PM2 config, server setup scripts, Apache proxy
scripts/           Deployment script (deploy-to-prod.ps1)
docs/              Architecture, API contracts, operational runbooks
README/            Setup guides, cheatsheets, and walkthroughs
env.example        Full environment variable template
INSTALL.md         Step-by-step installation guide
CHANGELOG.md       Version history
LICENSE            Envato license terms
```

---

## Documentation

All guides are in the `README/` directory:

| # | File | Purpose |
|---|---|---|
| 01 | [About Us](README/01-about-us.md) | Who we are, what we do |
| 02 | [Project Overview](README/02-project-overview.md) | Features, audience, selling points |
| 03 | [Deployment Requirements](README/03-deployment-requirements.md) | Server specs, best practices |
| 04 | [Android App Setup](README/04-android-app-setup.md) | Build and publish the mobile app |
| 05 | [README](README/05-readme.md) | This file |
| 06 | [Agent Introduction](README/06-agent-introduction.md) | AI assistant onboarding for the repo |
| 07 | [Google Play Cheatsheet](README/07-google-play-cheatsheet.md) | Play Store form answers |
| 08 | [Theme Customization](README/08-theme-customization.md) | Dark/light mode color guide |
| 09 | [Step-by-Step Guide](README/09-step-by-step-guide.md) | Which doc to read for what action |
| 10 | [API Keys Guide](README/10-api-keys-guide.md) | Every key, where to get it, where to set it |

---

## Deploy to Production

```powershell
.\scripts\deploy-to-prod.ps1 `
  -SshHost user@yourserver `
  -ApiUrl https://api.yourdomain.com `
  -DashUrl https://app.yourdomain.com `
  -AdminUrl https://admin.yourdomain.com
```

---

## Support

- **Documentation:** `README/` directory and `docs/` directory
- **Issues:** GitHub Issues on this repository
- **Email:** hello@mulawave.com

---

## License

Licensed under the [Envato Regular or Extended License](LICENSE).

---

*Built by [Raven AI](README/01-about-us.md) — production software, not prototypes.*
