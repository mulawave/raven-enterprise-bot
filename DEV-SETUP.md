# 🚀 Dev Environment Setup

## Prerequisites

- Node.js 18.20.4 (see `.nvmrc`)
- Docker Desktop
- nvm (Node Version Manager)

## First Time Setup

```bash
# Lock Node version
nvm use

# Clean install
rm -rf node_modules package-lock.json
npm install

# Install dependencies in all workspaces
cd backend && npm install
cd ../admin-console && npm install
cd ../dashboard && npm install
```

## Daily Development

### Start Everything (One Command)

```bash
start.bat
```

This will:
1. Kill zombie ports (3000, 3001, 4000)
2. Clean Next.js caches
3. Start Docker (postgres, redis)
4. Wait for backend readiness
5. Start backend (http://localhost:4000)
6. Start admin console (http://localhost:3001)
7. Start dashboard (http://localhost:3000)

### Stop Everything

```bash
stop.bat
```

## Services

- **Backend API**: http://localhost:4000
  - Health: http://localhost:4000/health
  - Ready: http://localhost:4000/api/ready
  
- **Admin Console**: http://localhost:3001/admin-login
  - Default credentials: `admin@raven.ai / SuperAdmin123!`
  
- **Tenant Dashboard**: http://localhost:3000

## Troubleshooting

### "Port already in use"

Run `stop.bat` first, then `start.bat`

### "Backend not responding"

Check Docker is running:
```bash
docker ps
```

Should see `postgres` and `redis` containers.

### "Unauthorized" on login

Ensure SUPER_ADMIN user exists:
```bash
cd backend
set DATABASE_URL=postgresql://app_user:change_me@localhost:5432/app_db
node dist/prisma/seed-super-admin.js
```

### Next.js build errors

Clear cache manually:
```bash
powershell -ExecutionPolicy Bypass -File scripts/clean-next.ps1
```

## Manual Control

If you need to start services individually:

```bash
# Backend only
cd backend
set DATABASE_URL=postgresql://app_user:change_me@localhost:5432/app_db
set REDIS_URL=redis://localhost:6379
set JWT_SECRET=local_dev_only
npm run start

# Admin console only
cd admin-console
npm run dev

# Dashboard only
cd dashboard
npm run dev
```
