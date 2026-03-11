# cPanel Node.js App Setup Guide
# Raven Enterprise — raven-ai.online

This guide walks through the cPanel UI configuration required after running
`deploy/01-server-setup.sh` and `deploy/02-first-deploy.sh`.

---

## Prerequisites

- `deploy/01-root-db-setup.sh` completed as root (PostgreSQL db + user created, credentials saved)
- `deploy/02-user-setup.sh` completed as ravenai user (Redis compiled, all 3 apps built, migrations run)
- Three subdomains created in cPanel:
  - `api.raven-ai.online`
  - `app.raven-ai.online`
  - `admin.raven-ai.online`

---

## Step 1 — Create the subdomains

**cPanel → Domains → Create A New Domain**

For each of the three subdomains above:
1. Enter the subdomain name (e.g. `api.raven-ai.online`)
2. Leave "Share document root" **unchecked**
3. Let cPanel create a dedicated document root (e.g. `/home/<user>/api.raven-ai.online`)
4. Click **Submit**

---

## Step 2 — Enable AutoSSL (HTTPS/TLS)

**WHM → SSL/TLS → Manage AutoSSL**
- Ensure "Let's Encrypt" provider is selected
- Click **Run AutoSSL For All Users** — this issues free TLS certs for all subdomains

Or per-user: **cPanel → SSL/TLS Status → Run AutoSSL**

---

## Step 3 — Create Node.js Apps

**cPanel → Software → Setup Node.js App → Create Application**

Repeat for each of the three apps below.

### App 1 — NestJS API (`api.raven-ai.online`)

| Field | Value |
|---|---|
| Node.js version | **20** (or highest available) |
| Application mode | **Production** |
| Application root | `raven-enterprise-bot/backend` |
| Application URL | `api.raven-ai.online` |
| Application startup file | `app.js` |

After saving, click **Run NPM Install** (you can skip — `02-first-deploy.sh` already ran `npm ci`).

### App 2 — Dashboard (`app.raven-ai.online`)

| Field | Value |
|---|---|
| Node.js version | **20** |
| Application mode | **Production** |
| Application root | `raven-enterprise-bot/dashboard` |
| Application URL | `app.raven-ai.online` |
| Application startup file | `server.js` |

### App 3 — Admin Console (`admin.raven-ai.online`)

| Field | Value |
|---|---|
| Node.js version | **20** |
| Application mode | **Production** |
| Application root | `raven-enterprise-bot/admin-console` |
| Application URL | `admin.raven-ai.online` |
| Application startup file | `server.js` |

---

## Step 4 — Set environment variables

In cPanel "Setup Node.js App", each app has an **Environment Variables** section.
Paste the variables from `deploy/production-env-template.env` into the relevant app.

**API** (`api.raven-ai.online`) — key variables:
```
NODE_ENV=production
DATABASE_URL=postgresql://ravenuser:<password>@127.0.0.1:5432/ravendb
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=<64+ char random string>
META_APP_SECRET=<from Meta Developer Portal>
PAYSTACK_SECRET_KEY=sk_live_<key>
CORS_ORIGINS=https://app.raven-ai.online,https://admin.raven-ai.online
SENTRY_DSN=<from sentry.io — optional>
APP_URL=https://app.raven-ai.online
ADMIN_URL=https://admin.raven-ai.online
API_URL=https://api.raven-ai.online
PORT=   ← leave blank — Passenger sets this automatically
```

**Dashboard** (`app.raven-ai.online`) — key variables:
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.raven-ai.online
NEXT_PUBLIC_SENTRY_DSN=<from sentry.io — optional>
```

**Admin Console** (`admin.raven-ai.online`) — key variables:
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.raven-ai.online
NEXT_PUBLIC_SENTRY_DSN=<from sentry.io — optional>
```

> **Important:** `NEXT_PUBLIC_*` variables are embedded at **build time**, not runtime.
> After setting them in cPanel, re-run the build:
> ```bash
> # SSH in as cPanel user
> cd ~/raven-enterprise-bot/dashboard && npm run build
> cp -r .next/static .next/standalone/.next/static
> # Then restart: touch tmp/restart.txt
> ```

---

## Step 5 — Seed the super-admin

SSH in as the cPanel user and run:

```bash
cd ~/raven-enterprise-bot/backend

# Option A: use defaults (email: admin@raven.ai, password: SuperAdmin123!)
npx ts-node prisma/seed-super-admin.ts

# Option B: use custom credentials
SUPER_ADMIN_EMAIL=you@yourdomain.com \
SUPER_ADMIN_PASSWORD=YourStrongPassword123! \
npx ts-node prisma/seed-super-admin.ts
```

**Change the password immediately** after first login at `https://admin.raven-ai.online`.

---

## Step 6 — Restart all apps

```bash
# SSH as cPanel user
touch ~/raven-enterprise-bot/backend/tmp/restart.txt
touch ~/raven-enterprise-bot/dashboard/tmp/restart.txt
touch ~/raven-enterprise-bot/admin-console/tmp/restart.txt
```

Passenger detects `tmp/restart.txt` and gracefully restarts the Node.js process.

---

## Step 7 — Health checks

```bash
curl https://api.raven-ai.online/health
# Expected: {"status":"ok","timestamp":"...","checks":{...}}

curl -I https://app.raven-ai.online
# Expected: HTTP/2 200

curl -I https://admin.raven-ai.online
# Expected: HTTP/2 200
```

---

## Step 8 — Configure GitHub Actions (for CD)

In your GitHub repository → **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | Server IP or `raven-ai.online` |
| `DEPLOY_USER` | cPanel SSH username |
| `DEPLOY_SSH_KEY` | Contents of the SSH private key generated for deployment |
| `DEPLOY_PORT` | `22` (or whatever your server's SSH port is — check in WHM) |

Generate a deploy key pair (on your local machine):
```bash
ssh-keygen -t ed25519 -C "raven-deploy" -f raven-deploy-key -N ""
# raven-deploy-key      → paste contents into GitHub secret DEPLOY_SSH_KEY
# raven-deploy-key.pub  → append to ~/.ssh/authorized_keys on the server
```

The production workflow now uploads a release tarball and the latest
`deploy/deploy.sh` over SSH, then deploys from that archive on the server.
It does not require a git checkout or remote on the production machine.

### Manual redeploy without git

You can run the same flow manually from a workstation:

```bash
bash deploy/create-release-archive.sh ./raven-deploy.tar.gz
scp ./raven-deploy.tar.gz deploy/deploy.sh ravenai@raven-ai.online:~/
ssh ravenai@raven-ai.online 'bash ~/deploy.sh ~/raven-deploy.tar.gz'
```

The server deploy script preserves the existing `backend/uploads` directory and
the app `.env` / `.env.local` files while replacing the release contents.

---

## What cPanel auto-generates

When you save each "Setup Node.js App" configuration, cPanel writes a `.htaccess`
into the **subdomain document root** (e.g. `~/api.raven-ai.online/`) with content like:

```apache
PassengerEnabled On
PassengerNodejs /opt/cpanel/ea-nodejs20/root/usr/bin/node
PassengerAppRoot /home/<user>/raven-enterprise-bot/backend
PassengerStartupFile app.js
PassengerAppType node
PassengerFriendlyErrorPages off
```

You do **not** need to write this manually — cPanel manages it. If you need to
debug Passenger issues, the log is at:
```
/var/log/apache2/domlogs/<user>.raven-ai.online.log
/var/log/apache2/domlogs/<user>-<subdomain>.log
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 503 Service Unavailable | Passenger can't start the app | Check Apache error log; ensure `npm run build:all` succeeded and `dist/` exists |
| API returns 500 on all routes | Missing env var | Check `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET` are set; API logs to stderr |
| Dashboard shows blank page | `NEXT_PUBLIC_API_URL` wrong or unset at build time | Set env var in cPanel then rebuild + copy static assets |
| `tmp/restart.txt` not working | Wrong ownership | Run `chown <user>:<user> ~/raven-enterprise-bot/*/tmp/restart.txt` as root |
| AutoSSL not issuing cert | DNS not propagated yet | Wait 15 min after subdomain creation; re-run AutoSSL |
