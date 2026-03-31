# API Keys Guide — Every Key You Need

This document lists **every API key and credential** required to run Raven Enterprise, from local development to full production deployment. Each section tells you what the key is for, where to get it, and where to put it.

---

## Quick Reference

| Key | Required For | Where to Get It | Env Variable |
|---|---|---|---|
| PostgreSQL credentials | Backend | Your server / hosting | `DATABASE_URL` |
| Redis URL | Backend | Your server / hosting | `REDIS_URL` |
| JWT Secret | Auth | Generate yourself | `JWT_SECRET` |
| Meta WhatsApp Token | Messaging | Meta Business Suite | `META_WA_TOKEN` |
| Meta Phone Number ID | Messaging | Meta Business Suite | `META_PHONE_NUMBER_ID` |
| Meta Verify Token | Webhook | You define it | `META_VERIFY_TOKEN` |
| OpenAI API Key | AI chatbot | OpenAI platform | `OPENAI_API_KEY` |
| Paystack Secret Key | Payments | Paystack dashboard | `PAYSTACK_SECRET_KEY` |
| Flutterwave Secret Key | Payments | Flutterwave dashboard | `FLW_SECRET_KEY` |
| SMTP credentials | Email | Your email provider | `SMTP_HOST`, `SMTP_USER`, etc. |
| Firebase (FCM) | Push notifications | Firebase Console | `FCM_PROJECT_ID`, etc. |
| Sentry DSN | Error monitoring | Sentry dashboard | `SENTRY_DSN` |
| reCAPTCHA keys | Bot protection | Google reCAPTCHA | `RECAPTCHA_SITE_KEY`, etc. |
| SSH credentials | Deployment | Your server | SSH key pair |

---

## 1. PostgreSQL Database

**What:** Connection string for the main database.

**Where to get it:**
1. On your server, create a PostgreSQL user and database:
   ```sql
   CREATE USER raven_db WITH PASSWORD 'your-secure-password';
   CREATE DATABASE raven_prod OWNER raven_db;
   ```
2. Or use a managed database (DigitalOcean, AWS RDS, etc.)

**Env variable:**
```
DATABASE_URL=postgresql://raven_db:your-secure-password@127.0.0.1:5432/raven_prod
```

**Tip:** Generate a strong password: `openssl rand -hex 32`

---

## 2. Redis

**What:** In-memory cache, job queues, and pub/sub for real-time features.

**Where to get it:**
- Install Redis on your server: `sudo apt install redis-server`
- Or use managed Redis (DigitalOcean, AWS ElastiCache, Upstash)

**Env variable:**
```
REDIS_URL=redis://localhost:6379
```

---

## 3. JWT Secret

**What:** Secret key used to sign and verify authentication tokens.

**Where to get it:** Generate it yourself — must be random, at least 64 characters.

```bash
openssl rand -base64 64
```

**Env variable:**
```
JWT_SECRET=your-random-64-char-string-here
```

> **CRITICAL:** Never share this. If compromised, regenerate immediately — all users will need to log in again.

---

## 4. Meta WhatsApp Business API

**What:** Connects Raven to WhatsApp via the official Meta Cloud API.

**Where to get it:**

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create an App → select "Business" type
3. Add the **WhatsApp** product
4. In WhatsApp → Getting Started:
   - Find your **Phone Number ID** (e.g., `123456789012345`)
   - Find your **WhatsApp Business Account ID**
   - Generate a **permanent access token** (System Users → Generate Token with `whatsapp_business_messaging` permission)

5. Set up the **webhook**:
   - Callback URL: `https://api.yourdomain.com/webhook/whatsapp`
   - Verify token: Any string you choose (must match `META_VERIFY_TOKEN`)
   - Subscribe to: `messages`, `message_status`

**Env variables:**
```
META_WA_TOKEN=EAAxxxxxxx...     # Permanent access token
META_PHONE_NUMBER_ID=123456789012345
META_WA_BUSINESS_ID=987654321098765
META_VERIFY_TOKEN=my-custom-verify-string
```

**Detailed guide:** [Meta WhatsApp Cloud API docs](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

---

## 5. OpenAI API Key

**What:** Powers the AI chatbot (GPT) that handles automated conversations.

**Where to get it:**

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to **API Keys** → **Create new secret key**
4. Copy the key (shown only once)

**Env variable:**
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Pricing:** Pay-per-use. GPT-4o-mini costs ~$0.15/1M input tokens. Monitor usage at [platform.openai.com/usage](https://platform.openai.com/usage).

---

## 6. Paystack (Payment Gateway)

**What:** Processes card/bank payments for subscriptions and orders (popular in Africa).

**Where to get it:**

1. Go to [Paystack Dashboard](https://dashboard.paystack.com/)
2. Sign up and verify your business
3. Go to **Settings** → **API Keys & Webhooks**
4. Copy the **Secret Key** (starts with `sk_live_` or `sk_test_`)
5. Set the **Webhook URL** to: `https://api.yourdomain.com/payments/webhook/paystack`

**Env variables:**
```
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxx
PAYMENT_CALLBACK_URL=https://app.yourdomain.com/payment/callback
```

> Use `sk_test_` and `pk_test_` keys for development/testing.

---

## 7. Flutterwave (Payment Gateway)

**What:** Alternative payment processor (broader African coverage, international cards).

**Where to get it:**

1. Go to [Flutterwave Dashboard](https://dashboard.flutterwave.com/)
2. Sign up and verify
3. Go to **Settings** → **API Keys**
4. Copy the **Secret Key** and **Public Key**
5. Set webhook: `https://api.yourdomain.com/payments/webhook/flutterwave`

**Env variables:**
```
FLW_SECRET_KEY=FLWSECK-xxxxxxxxxxxxxxxxxxxxxxxx-X
FLW_PUBLIC_KEY=FLWPUBK-xxxxxxxxxxxxxxxxxxxxxxxx-X
FLW_ENCRYPT_KEY=xxxxxxxxxxxxxxxx
```

---

## 8. SMTP Email Credentials

**What:** Sends transactional emails (welcome, password reset, invoices).

**Where to get it:**

**Option A — Gmail (development only):**
1. Enable 2FA on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate an app password for "Mail"

**Option B — Dedicated SMTP (production recommended):**
- [Mailgun](https://www.mailgun.com/) — 5,000 free/month
- [Brevo (Sendinblue)](https://www.brevo.com/) — 300 free/day
- [Amazon SES](https://aws.amazon.com/ses/) — cheapest at scale
- [Postmark](https://postmarkapp.com/) — best deliverability

**Env variables:**
```
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

---

## 9. Firebase Cloud Messaging (FCM)

**What:** Push notifications for the mobile app and web dashboard.

**Where to get it:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project (or use existing)
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate new private key** → downloads a JSON file
5. Extract these values from the JSON:

**Env variables:**
```
FCM_PROJECT_ID=your-project-id
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

**For the mobile app:**
6. In Firebase Console → Project Settings → **Your apps** → Add Android app
7. Package name: must match `android.package` in `mobile/app.json`
8. Download `google-services.json` → place at `mobile/google-services.json`

> **IMPORTANT:** The `FCM_PRIVATE_KEY` must be on one line with `\n` for newlines, wrapped in double quotes.

---

## 10. Sentry (Error Monitoring)

**What:** Captures runtime errors, stack traces, and performance metrics.

**Where to get it:**

1. Go to [Sentry](https://sentry.io/) → Sign up (free tier: 5K errors/month)
2. Create a project → select **Next.js** (for dashboard/admin) and **Node.js** (for backend)
3. Copy the **DSN** from Project Settings → Client Keys

**Env variables:**
```
SENTRY_DSN=https://xxxxxxx@oXXXXXX.ingest.sentry.io/XXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxx@oXXXXXX.ingest.sentry.io/XXXXXXX
```

> The `NEXT_PUBLIC_` prefix exposes it to the browser. This is safe — Sentry DSNs are meant to be public.

---

## 11. Google reCAPTCHA

**What:** Prevents bot signups on tenant registration forms.

**Where to get it:**

1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin/)
2. Register a new site → select **reCAPTCHA v2** (Checkbox) or **v3** (Invisible)
3. Add your domain(s)
4. Copy the **Site Key** and **Secret Key**

**Env variables:**
```
RECAPTCHA_SITE_KEY=6Lcxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RECAPTCHA_SECRET_KEY=6Lcxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 12. SSH Key Pair (Deployment)

**What:** Passwordless SSH access for the deploy script.

**How to set up:**

1. Generate a key pair (on your local machine):
   ```bash
   ssh-keygen -t ed25519 -C "deploy@yourdomain.com"
   ```

2. Copy the public key to your server:
   ```bash
   ssh-copy-id user@yourserver
   ```

3. Set up an SSH config alias (optional but recommended):
   ```
   # ~/.ssh/config
   Host raven-prod
     Hostname your.server.ip
     User your-username
     IdentityFile ~/.ssh/id_ed25519
   ```

4. Test: `ssh raven-prod "echo connected"`

**Used by:**
```powershell
.\scripts\deploy-to-prod.ps1 -SshHost raven-prod
```

---

## 13. Android Signing Keystore (Mobile App)

**What:** Signs the Android APK/AAB for Play Store distribution.

**How to create:**

```bash
keytool -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass YOUR_PASSWORD \
  -keypass YOUR_PASSWORD \
  -alias your-key-alias \
  -keystore release.keystore
```

**Where to put it:** `mobile/android/app/release.keystore`

> **CRITICAL:** Back up this file and password securely. If lost, you cannot update the app on Play Store — ever.

See [04-android-app-setup.md](04-android-app-setup.md) for full signing configuration.

---

## Where to Put All Keys

All keys go in the `.env` file. Copy from `env.example`:

```bash
cp env.example .env
# Edit .env with your actual values
# Then copy to each service:
cp .env backend/.env
cp .env dashboard/.env
cp .env admin-console/.env
```

### For the mobile app:
Edit `mobile/src/constants/config.ts` directly — it doesn't use `.env`.

---

## Checklist

- [ ] PostgreSQL — `DATABASE_URL` set
- [ ] Redis — `REDIS_URL` set
- [ ] JWT — `JWT_SECRET` generated (64+ chars)
- [ ] Meta WhatsApp — `META_WA_TOKEN`, `META_PHONE_NUMBER_ID`, `META_VERIFY_TOKEN`
- [ ] OpenAI — `OPENAI_API_KEY` set
- [ ] Paystack — `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`
- [ ] Flutterwave — `FLW_SECRET_KEY`, `FLW_PUBLIC_KEY` (if using)
- [ ] SMTP — `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- [ ] Firebase — `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`
- [ ] Sentry — `SENTRY_DSN` (optional but recommended)
- [ ] reCAPTCHA — `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY` (optional)
- [ ] SSH — key pair created + tested
- [ ] Mobile — `google-services.json` placed, `config.ts` updated

---

*All keys are stored in `.env` which is git-ignored. Never commit secrets to the repository.*
