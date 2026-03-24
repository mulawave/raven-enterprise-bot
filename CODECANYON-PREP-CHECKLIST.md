# CodeCanyon Release Preparation Checklist

> Generated: March 24, 2026
> Status: PENDING — to be addressed in a separate repo copy before listing

---

## 1. Hardcoded Webhook URLs (CODE BLOCKER)

**File:** `backend/apps/api/messaging/conversations.controller.ts`

Three URLs are hardcoded to `raven-ai.online`:

```typescript
const mediaUrl = `https://api.raven-ai.online/uploads/media/${file.filename}`
webhookUrl: 'https://api.raven-ai.online/api/messaging/webhook/whatsapp'
webhookVerifyUrl: 'https://api.raven-ai.online/api/messaging/webhook/verify'
```

**Fix required:** Replace with a configurable env var (e.g. `API_PUBLIC_URL`) so buyers deploying on their own domain have working WhatsApp webhooks.

---

## 2. Incomplete `env.example`

The root `env.example` only covers ~12 variables. Critical vars missing:

| Missing Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Frontend → Backend API URL |
| `APP_URL` | Dashboard public URL |
| `ADMIN_URL` | Admin console public URL |
| `API_URL` | Backend public URL |
| `META_ACCESS_TOKEN` | WhatsApp Cloud API token |
| `META_PHONE_NUMBER_ID` | WhatsApp phone number ID |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave payment gateway |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `SMTP_HOST` | Email server host |
| `SMTP_PORT` | Email server port |
| `SMTP_USER` | Email username |
| `SMTP_PASS` | Email password |
| `NEXT_PUBLIC_SENTRY_DSN` | Frontend error tracking |
| Firebase config vars | Push notifications |

**Fix required:** Merge all vars from `deploy/production-env-template.env` into `env.example` with clear comments and placeholder values. Make `env.example` the single source of truth.

---

## 3. No Reference Data Seeded

After `prisma migrate deploy` + seed, the database has ONLY one super admin user. Missing:

- **Subscription plans** — tenants cannot register without at least one plan
- **System configuration** — reCAPTCHA keys, payment gateway settings
- **Email templates** — no transactional email content
- **Default categories/settings** — empty system

**Fix required:** Create a comprehensive seed script (`prisma/seed.ts`) that populates:
- Default subscription plans (Free, Starter, Pro, Enterprise)
- System configuration defaults
- Sample email templates
- Any required reference data for first-time run

Register it in `package.json` under `"prisma": { "seed": "ts-node prisma/seed.ts" }`.

---

## 4. PM2 Ecosystem Paths Hardcoded

**File:** `deploy/ecosystem.config.js`

All paths hardcoded to `/home/ravenai/`:

```javascript
cwd: '/home/ravenai/raven-enterprise-bot/backend'
```

**Fix required:** Use a variable or relative paths so buyers don't need to manually edit paths for their cPanel username.

---

## 5. First-Time Installation Guide

Currently deployment docs are split across multiple files:
- `deploy/cpanel-setup.md`
- `deploy/01-root-db-setup.sh`
- `deploy/02-first-deploy.sh`
- `deploy/production-env-template.env`

**Fix required:** Create a single, clear `INSTALL.md` at repo root covering:
1. System requirements (Node.js version, PostgreSQL, Redis)
2. cPanel setup steps (subdomains, SSL)
3. Environment configuration (single env template with all vars explained)
4. Database setup + migration + seed
5. Build all 3 services
6. Start/restart instructions
7. Post-install verification checklist
8. Admin console first login + initial setup walkthrough

---

## 6. Domain-Agnostic Configuration

Ensure ALL domain references are configurable via env vars:
- Backend CORS origins
- Frontend API URL fallbacks
- Webhook registration URLs
- Media/upload public URLs
- Apache proxy configs should be templates with placeholder domain

---

## 7. CodeCanyon Package Requirements

- [ ] Clean README.md with feature list, screenshots, tech stack
- [ ] LICENSE file
- [ ] Documentation PDF or hosted docs link
- [ ] Demo credentials / demo site info
- [ ] Changelog
- [ ] Remove all `raven-ai.online` specific references from runtime code
- [ ] Ensure `.env.example` is complete and well-commented
- [ ] Test full install from zip on a clean machine
