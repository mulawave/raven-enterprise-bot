# Agent Introduction — Raven Enterprise Platform

> **READ THIS FIRST.** This file is designed to be the very first thing a coding AI agent reads when this project is imported into VS Code. It provides everything the agent needs to understand the project, navigate the codebase, and help the user build and deploy.

---

## What This Project Is

Raven is a **multi-tenant WhatsApp Business automation platform** — a complete SaaS system with:

- **Backend API** (`backend/`) — NestJS, Prisma ORM, PostgreSQL, Redis
- **Tenant Dashboard** (`dashboard/`) — Next.js 14, Tailwind CSS (port 4011)
- **Admin Console** (`admin-console/`) — Next.js 14, Tailwind CSS (port 4012)
- **Mobile App** (`mobile/`) — Expo React Native (Android + iOS ready)
- **Deploy Scripts** (`scripts/deploy-to-prod.ps1`) — One-command production deployment

All three web services run behind a reverse proxy (Apache or Nginx) on these internal ports:

| Service | Port | PM2 Name |
|---|---|---|
| Backend API | 4010 | raven-api |
| Background Worker | — | raven-worker |
| Dashboard | 4011 | raven-dashboard |
| Admin Console | 4012 | raven-admin |

---

## Critical Rules — Read Before Making ANY Change

### Port Rules
- **Port 3000 is FORBIDDEN.** Never bind, reference, or kill port 3000.
- Raven uses ports **4010, 4011, 4012** only.

### Timeout Rules
- **NEVER add request timeouts** to any API client — no `AbortController`, no `timeoutMs`, no `setTimeout` on fetch. The user base may be on slow 2G/3G networks.

### Architecture Rules
- Do NOT redesign the architecture or introduce new services/databases
- Do NOT use Firebase/Supabase/PlanetScale as backends (Firebase is only used for push notifications via FCM)
- Do NOT invent features that were not asked for
- Production-grade code only — no `console.log` left behind, no TODO stubs

### Deployment Rules
- The **ONLY** way to deploy is `scripts/deploy-to-prod.ps1`
- NEVER manually SCP files, SSH and run commands, or invent alternative deploy methods
- If the deploy script fails, fix the script — don't work around it

### UI Rules
- Every async button MUST use `isLoading` state with a spinner — never allow double-submission
- Use shimmer-first loading — render the page shell immediately, replace data cells with shimmer when loading. NEVER use `if (isLoading) return <Skeleton />`
- Follow Stripe/Linear/Vercel design principles — every CTA needs an icon, label, and description

---

## Technology Stack

| Layer | Technology | Config Location |
|---|---|---|
| Backend | NestJS 10, TypeScript | `backend/tsconfig.json`, `backend/nest-cli.json` |
| ORM | Prisma 5 | `backend/prisma/schema.prisma` |
| Database | PostgreSQL 16 | `.env` → `DATABASE_URL` |
| Cache/Queue | Redis (ioredis) | `.env` → `REDIS_URL` |
| Dashboard | Next.js 14 (standalone) | `dashboard/next.config.js` |
| Admin | Next.js 14 (standalone) | `admin-console/next.config.js` |
| Mobile | Expo SDK 55, React Native | `mobile/app.json` |
| Styling | Tailwind CSS | `dashboard/tailwind.config.ts`, `admin-console/tailwind.config.ts` |
| Process Mgr | PM2 | `deploy/ecosystem.config.js` |
| Push Notifs | Firebase Cloud Messaging | `mobile/google-services.json`, `.env` → FCM vars |
| Payments | Paystack + Flutterwave | `.env` → `PAYSTACK_SECRET_KEY`, `FLW_SECRET_KEY` |
| AI | OpenAI GPT | `.env` → `OPENAI_API_KEY` |
| Errors | Sentry | `.env` → `SENTRY_DSN` |

---

## Database Schema Overview

The Prisma schema at `backend/prisma/schema.prisma` contains 35+ models. Key ones:

| Model | Purpose |
|---|---|
| `Tenant` | Root entity for each business (branding, theme, suspension state) |
| `User` | Staff users with roles: SUPER_ADMIN, admin, owner, staff |
| `Customer` | End-customers created per tenant |
| `Conversation` | WhatsApp conversation threads |
| `Message` | Individual messages in conversations |
| `Order` / `OrderItem` | E-commerce orders with line items |
| `MenuItem` / `MenuCategory` | Product catalog per tenant |
| `Payment` | Payment records (Paystack/Flutterwave) |
| `Subscription` / `Plan` | Billing plans and tenant subscriptions |
| `TenantBotConfig` | AI bot personality per tenant |
| `TenantFaq` | Knowledge base (manual + auto-learned from conversations) |
| `SystemConfig` | Key-value system settings |
| `FcmToken` | Push notification tokens |
| `TenantKyc` | KYC verification status |

### Important Prisma conventions
- Model names are PascalCase in the schema (`TenantFaq`)
- Prisma client properties are camelCase (`prisma.tenantFaq`)
- **Always read the schema before writing Prisma queries** — guessing field/model names causes runtime 500 errors
- Run `npx prisma generate` after any schema change
- Run `npx prisma migrate dev` to create new migrations locally

---

## Environment Variables

All configuration is via environment variables. See `env.example` for the complete list.

**Critical variables** (required for the app to start):

```
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-random-secret
API_URL=http://localhost:4010
APP_URL=http://localhost:4011
ADMIN_URL=http://localhost:4012
CORS_ORIGINS=http://localhost:4011,http://localhost:4012
```

**For frontends** (baked into the build — set BEFORE `npm run build`):

```
NEXT_PUBLIC_API_URL=http://localhost:4010
```

---

## Getting Started — First Time Setup

### Step 1: Install dependencies
```bash
cd backend && npm install && cd ..
cd dashboard && npm install && cd ..
cd admin-console && npm install && cd ..
```

### Step 2: Configure environment
```bash
cp env.example .env
# Edit .env with your database URL, Redis URL, JWT secret
# Copy to each service:
cp .env backend/.env
cp .env dashboard/.env
cp .env admin-console/.env
```

### Step 3: Set up the database
```bash
cd backend
npx prisma migrate deploy --schema=prisma/schema.prisma
npx prisma generate --schema=prisma/schema.prisma
npx prisma db seed    # Creates admin user, plans, and system config
cd ..
```

### Step 4: Build all services
```bash
cd backend && npm run build:all && cd ..
cd dashboard && npm run build && cd ..
cd admin-console && npm run build && cd ..
```

### Step 5: Start with PM2
```bash
export PM2_APP_ROOT=$(pwd)    # or set in ecosystem.config.js
pm2 start deploy/ecosystem.config.js
```

### Step 6: Verify
```bash
curl http://localhost:4010/health    # → {"status":"ok"}
# Open http://localhost:4011 (dashboard)
# Open http://localhost:4012 (admin console)
```

---

## Production Deployment

```powershell
.\scripts\deploy-to-prod.ps1 `
  -SshHost user@yourserver `
  -ApiUrl https://api.yourdomain.com `
  -DashUrl https://app.yourdomain.com `
  -AdminUrl https://admin.yourdomain.com
```

The script:
1. Verifies SSH connectivity
2. Builds the targeted service(s) locally
3. Packages and SCPs to the server
4. Extracts, runs migrations (backend), restarts PM2
5. Clears reverse proxy cache
6. Runs smoke tests

Deploy a single service: `-Service api`, `-Service dash`, `-Service admin`

---

## Mobile App

The `mobile/` directory is an Expo React Native app.

```bash
cd mobile && npm install
# Edit src/constants/config.ts — set API_BASE_URL
# Edit app.json — set your package name and version
npx expo prebuild --platform android --clean
cd android && ./gradlew bundleRelease    # → AAB for Play Store
```

See `README/04-android-app-setup.md` for full build + signing + Play Store instructions.

---

## Dark / Light Theme System

Both dashboard and admin-console support dark and light mode via:

- **Tailwind:** `darkMode: 'class'` — toggled by adding/removing `dark` class on `<html>`
- **State:** `ThemeProvider` context at `dashboard/lib/theme-context.tsx` and `admin-console/lib/theme-context.tsx`
- **Persistence:** localStorage (`raven-theme` for dashboard, `raven-admin-theme` for admin)
- **Toggle:** Sun/Moon icon in both headers
- **Colors:** CSS custom properties in `globals.css` with dark overrides

See `README/08-theme-customization.md` for how to change the color palette.

---

## Key File Locations

| What | Where |
|---|---|
| Prisma schema | `backend/prisma/schema.prisma` |
| Seed data | `backend/prisma/seed.ts` |
| API modules | `backend/apps/api/src/app.module.ts` |
| Conversations controller | `backend/apps/api/messaging/conversations.controller.ts` |
| Auth module | `backend/apps/api/auth/` |
| Dashboard pages | `dashboard/app/` (Next.js App Router) |
| Admin pages | `admin-console/app/admin/` |
| API client (dashboard) | `dashboard/lib/api.ts` |
| API client (admin) | `admin-console/lib/api.ts` |
| Theme context | `dashboard/lib/theme-context.tsx`, `admin-console/lib/theme-context.tsx` |
| Mobile config | `mobile/src/constants/config.ts` |
| Deploy script | `scripts/deploy-to-prod.ps1` |
| PM2 config | `deploy/ecosystem.config.js` |
| Environment template | `env.example` |
| Server setup scripts | `deploy/` |
| Documentation | `README/` and `docs/` |

---

## What NOT to Do

1. **Never use port 3000** — it's reserved by other services on shared servers
2. **Never add timeouts to fetch/API calls** — users are on slow networks
3. **Never deploy manually** — always use `scripts/deploy-to-prod.ps1`
4. **Never modify the Prisma schema without creating a migration** — use `npx prisma migrate dev`
5. **Never guess Prisma model/field names** — read `backend/prisma/schema.prisma` first
6. **Never commit `.env` files** — they contain secrets
7. **Never use `if (isLoading) return <Skeleton />`** — use shimmer-first loading
8. **Never leave `console.log` in production code**
9. **Never use bare text links for CTAs** — use icon cards with descriptions
10. **Never introduce new databases or managed services** — stick to PostgreSQL + Redis

---

## Documentation Index

| # | File | When to Read |
|---|---|---|
| 01 | `README/01-about-us.md` | Who built this |
| 02 | `README/02-project-overview.md` | What this platform does, features |
| 03 | `README/03-deployment-requirements.md` | Server specs, hosting options |
| 04 | `README/04-android-app-setup.md` | Mobile app build + Play Store |
| 05 | `README/05-readme.md` | Main project README |
| 06 | `README/06-agent-introduction.md` | **This file** — AI agent onboarding |
| 07 | `README/07-google-play-cheatsheet.md` | Play Store submission answers |
| 08 | `README/08-theme-customization.md` | Changing colors and theme |
| 09 | `README/09-step-by-step-guide.md` | Which doc for which action |
| 10 | `README/10-api-keys-guide.md` | Every API key, where to get it |

For deeper technical docs, see the `docs/` directory (architecture, API contracts, runbooks).

---

*This document is the single onboarding file for any AI coding assistant working on this repository. Read it first, then ask the user what they need.*
