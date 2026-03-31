# Raven Enterprise Platform — Project Overview

## What Is Raven?

Raven is a **complete multi-tenant WhatsApp Business automation platform** that lets businesses automate customer conversations with AI, manage live agent handoff, process orders, handle payments, and run their entire customer operations — all through WhatsApp.

It ships as a **full-stack SaaS system** with:
- A **NestJS backend API** (REST + WebSocket)
- A **Next.js tenant dashboard** (for business owners and staff)
- A **Next.js admin console** (for the platform operator / you)
- An **Expo React Native mobile app** (for tenant staff on the go)
- **PostgreSQL** database with 35+ production-ready models
- **Redis** for caching, queues, and real-time pub/sub
- **PM2** process management for zero-downtime production deployment

---

## Who Should Buy This?

### SaaS Entrepreneurs
You want to launch a WhatsApp automation platform and charge businesses monthly. Raven gives you the entire platform — multi-tenant architecture, subscription billing, plan limits, KYC verification — ready to deploy under your own domain.

### Digital Agencies
You serve SMB clients who need WhatsApp chatbots, order management, or booking systems. Deploy one Raven instance and onboard all your clients as tenants, each with isolated data and their own dashboard.

### Software Developers & Freelancers
You've been hired to build a WhatsApp business tool. Raven saves you 6–12 months of development. Customize and extend what's already built instead of starting from scratch.

### Businesses That Want to Self-Host
You need WhatsApp automation but don't want to pay per-seat SaaS fees forever. Buy once, deploy on your own server, own your data.

---

## Why Raven?

### It's Not a Template — It's a Product

| What you get | What most "templates" give you |
|---|---|
| 35+ database models with full migrations | 3–5 demo tables |
| AI chatbot with live agent takeover | Static hardcoded bot replies |
| Real payment processing (Paystack + Flutterwave) | "Payment integration coming soon" |
| Admin console with KYC, plans, tenant management | No admin panel |
| Mobile app (Expo RN, ready for Play Store) | No mobile app |
| Production deploy script (1 command) | "Deploy manually to Heroku" |
| Dark/light theme across all frontends | No theming |
| Push notifications (FCM) for web + mobile | No notifications |

### Key Features

**AI & Messaging**
- GPT-powered chatbot with per-tenant system prompts and tone configuration
- Smart handoff — bot detects when it can't answer and routes to a human agent with context summary
- Hidden FAQ learning — AI analyzes conversations and auto-generates FAQ entries
- Real-time messaging with typing indicators, read receipts, and media support

**Commerce**
- Product catalog with categories, prices, and images
- Cart, checkout, and order tracking via WhatsApp
- Payment gateway integration (Paystack and Flutterwave)
- Automated PDF receipt generation and WhatsApp delivery
- Hotel/booking module with room types and date-based reservations

**Platform Management**
- Multi-tenant with complete data isolation
- Subscription plans with conversation limits (Free, Starter, Professional, Enterprise)
- KYC verification workflow (pending → submitted → verified → rejected)
- Reseller/partner accounts that manage multiple tenants
- Feature flags per tenant
- GDPR compliance: consent tracking, data deletion requests

**Operations**
- Admin console: tenant management, plan assignment, system config, audit logs
- Staff notifications (in-app + push via Firebase Cloud Messaging)
- SLA tracking per tenant
- Usage analytics and conversation metrics
- Comprehensive audit trail on payments, orders, and admin actions

**Mobile**
- Expo React Native app for Android (iOS-ready)
- Push notifications, badge counters, conversation management
- Onboarding wizard for new tenants
- Offline-resilient — designed for 2G/3G networks

---

## Selling Points Summary

1. **Multi-tenant SaaS** — deploy once, onboard unlimited businesses
2. **AI chatbot + live agent** — GPT-powered with human takeover
3. **WhatsApp native** — Meta Cloud API integration, not third-party bridges
4. **Payments built in** — Paystack + Flutterwave, PDF receipts, audit trails
5. **Mobile app included** — Expo React Native, Play Store ready
6. **Admin console** — full platform management from day one
7. **1-command deploy** — PowerShell script handles build, SCP, migrate, restart
8. **Dark/light theme** — professional UI across all frontends
9. **Production-grade** — 35+ models, migrations, seed data, error monitoring
10. **White-label ready** — all branding configurable via environment variables

---

## Technical Specifications

| Component | Technology | Version |
|---|---|---|
| Backend | NestJS (Node.js) | 20.x LTS |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 14+ (16 recommended) |
| Cache / Queue | Redis (ioredis) | 6+ |
| Dashboard | Next.js + Tailwind CSS | 14.x |
| Admin Console | Next.js + Tailwind CSS | 14.x |
| Mobile App | Expo + React Native | SDK 55 |
| Process Manager | PM2 | Latest |
| Push Notifications | Firebase Cloud Messaging | Admin SDK |
| Error Monitoring | Sentry | Latest |
| AI | OpenAI GPT API | Latest |
| Payments | Paystack + Flutterwave | REST API |

---

## What's Included in Your Purchase

```
backend/           NestJS API + background worker
dashboard/         Next.js tenant dashboard
admin-console/     Next.js super admin panel
mobile/            Expo React Native Android/iOS app
deploy/            PM2 config, server setup scripts, Apache proxy
scripts/           Production deploy script
docs/              Architecture docs, API contracts, runbooks
README/            Setup guides, key instructions, cheatsheets
env.example        Full environment variable template
INSTALL.md         Step-by-step installation guide
CHANGELOG.md       Version history
LICENSE            Envato license terms
```

---

*Built by Raven AI — production software, not prototypes.*
