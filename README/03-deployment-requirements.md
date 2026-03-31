# Deployment Requirements & Best Practices

## Minimum Server Requirements

| Resource | Minimum | Recommended |
|---|---|---|
| **OS** | Ubuntu 22.04 LTS / AlmaLinux 8+ | Ubuntu 24.04 LTS |
| **CPU** | 2 vCPU | 4 vCPU |
| **RAM** | 2 GB | 4 GB |
| **Disk** | 10 GB SSD | 20 GB SSD |
| **Node.js** | 20.x LTS | 20.x LTS (latest patch) |
| **PostgreSQL** | 14+ | 16 |
| **Redis** | 6+ | 7+ |
| **PM2** | Latest | Latest |

### Hosting Options

| Provider | Type | Notes |
|---|---|---|
| **cPanel/WHM VPS** | Recommended | Full control, SSH access, Let's Encrypt SSL |
| **DigitalOcean / Hetzner / Vultr** | VPS | Great price-performance ratio |
| **AWS EC2 / Lightsail** | Cloud / VPS | Good for scaling later |
| **Contabo** | Budget VPS | Affordable, good for starting out |

> **Important:** The server must allow you to install Node.js 20+, PostgreSQL, and Redis. Shared hosting (without SSH / root) will NOT work.

---

## Network & DNS Requirements

| Requirement | Details |
|---|---|
| **3 subdomains** | `api.yourdomain.com`, `app.yourdomain.com`, `admin.yourdomain.com` |
| **SSL certificates** | Required on all 3 subdomains (Let's Encrypt is free) |
| **SSH access** | Required for deployment script and server management |
| **Open ports** | 22 (SSH), 80 (HTTP), 443 (HTTPS) |

### Internal Ports (not exposed publicly — proxied via Apache/Nginx)

| Service | Internal Port |
|---|---|
| Backend API | 4010 |
| Tenant Dashboard | 4011 |
| Admin Console | 4012 |

> **CRITICAL:** Never use port 3000. If your server has other Node.js apps on cPanel, port 3000 is likely already in use.

---

## Software Prerequisites

### On your server
```bash
# Node.js 20 (via nvm or NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 16
sudo apt-get install -y postgresql-16

# Redis
sudo apt-get install -y redis-server

# PM2
npm install -g pm2

# Build tools (for native npm modules)
sudo apt-get install -y build-essential python3
```

### On your local machine (for deployment)
- **Windows PowerShell 5.1+** (for the deploy script)
- **SSH client** configured with key-based authentication to your server
- **Node.js 20+** and **npm** (for local builds before deploy)
- **Git** (for version control)

---

## Best Practices

### Security

1. **Never commit `.env` files** — use `env.example` as a template
2. **Use strong passwords** — generate database passwords with `openssl rand -hex 32`
3. **Generate a unique JWT secret** — `openssl rand -base64 64`
4. **Enable firewall** — only expose ports 22, 80, 443 publicly
5. **Use SSH key authentication** — disable password login
6. **Keep dependencies updated** — run `npm audit` periodically
7. **Enable Sentry** — configure `SENTRY_DSN` for real-time error alerts

### Performance

1. **Use SSD storage** — PostgreSQL performance depends heavily on disk I/O
2. **Configure PM2 memory limits** — the ecosystem.config.js caps API at 512MB, dashboards at 256MB
3. **Enable Nginx/Apache caching** — reduces load on Next.js processes
4. **Use Redis for sessions and queues** — never use in-memory stores in production
5. **Monitor with `pm2 monit`** — watch CPU and memory in real time

### Database

1. **Always run migrations before restarting** — `npx prisma migrate deploy`
2. **Run `prisma generate` after installing** — regenerates the Prisma client
3. **Back up daily** — `pg_dump ravendb > backup-$(date +%F).sql`
4. **Never modify the schema without creating a migration** — `npx prisma migrate dev`
5. **Seed on first install only** — `npx prisma db seed` creates plans and admin user

### Deployment

1. **Use the deploy script** — `scripts/deploy-to-prod.ps1` handles everything
2. **Always build locally first** — the script builds before deploying
3. **Check PM2 logs after deploy** — `ssh user@server "pm2 logs raven-api --lines 20 --nostream"`
4. **Create snapshots before risky changes** — use the `-Snapshot` flag
5. **Never SSH in and manually restart** — let the deploy script manage PM2

### Environment Variables

1. **Set `NEXT_PUBLIC_API_URL` before building dashboards** — it's baked into the build
2. **Match `CORS_ORIGINS` to your frontend URLs** — mismatches cause silent failures
3. **Set all payment keys in production** — missing keys = 500 errors on checkout
4. **Never add request timeouts** — users on slow networks need every second

---

## Pre-deployment Checklist

- [ ] Server has Node.js 20+, PostgreSQL, Redis installed
- [ ] 3 subdomains created and pointed to server IP
- [ ] SSL certificates provisioned (Let's Encrypt recommended)
- [ ] `.env` configured with all required variables (see `env.example`)
- [ ] Database created with dedicated user
- [ ] SSH key-based access configured
- [ ] Reverse proxy (Apache/Nginx) configured for all 3 subdomains
- [ ] Firewall rules: only 22, 80, 443 exposed
- [ ] Deploy script parameters configured (`-SshHost`, `-ApiUrl`, etc.)

---

## Post-deployment Verification

```bash
# Health check
curl https://api.yourdomain.com/health
# Expected: {"status":"ok","timestamp":"..."}

# Dashboard
curl -I https://app.yourdomain.com
# Expected: HTTP/2 200

# Admin console
curl -I https://admin.yourdomain.com
# Expected: HTTP/2 200 (or 302 redirect to login)

# PM2 status
ssh user@server "pm2 list"
# Expected: raven-api, raven-worker, raven-dashboard, raven-admin — all "online"
```

---

*See [10-api-keys-guide.md](10-api-keys-guide.md) for detailed instructions on obtaining every API key.*
