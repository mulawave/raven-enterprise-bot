# Raven Enterprise Bot - Startup Guide

## Quick Start

### Option 1: Automated Startup (Recommended)
```bash
# Double-click or run:
start.bat
```

This will automatically:
1. Start Docker containers (PostgreSQL & Redis)
2. Build the backend
3. Start backend server (port 4000)
4. Start dashboard (port 3001)

### Option 2: Manual Startup

#### Prerequisites
1. **Docker Desktop** must be running
2. **Node.js** installed (v20+)

#### Step-by-Step

**1. Start Docker Services**
```bash
cd docker
docker-compose up -d postgres redis
```

**2. Build Backend (first time or after code changes)**
```bash
cd backend
npm run build
```

**3. Start Backend Server**
```bash
cd backend
node dist\apps\api\src\main.js
```
Backend will run on http://localhost:4000

**4. Start Dashboard (in new terminal)**
```bash
cd dashboard
npx next dev -p 3001
```
Dashboard will run on http://localhost:3001

---

## Stopping the App

### Quick Stop
```bash
stop.bat
```

### Manual Stop
- Close the terminal windows running the servers
- Or press `Ctrl+C` in each terminal

---

## Troubleshooting

### "Port already in use"
```bash
# Find process using port
netstat -ano | findstr :4000
netstat -ano | findstr :3001

# Kill process (replace PID with actual process ID)
taskkill /F /PID <PID>
```

### "Cannot connect to database"
```bash
# Restart Docker containers
cd docker
docker-compose restart postgres redis
```

### Backend errors
```bash
# Rebuild backend
cd backend
npm run build

# Regenerate Prisma client
npx prisma generate
```

### Dashboard errors
```bash
# Reinstall dependencies
cd dashboard
npm install
```

---

## Development Workflow

### After pulling new code:
```bash
# Backend
cd backend
npm install
npm run build
npx prisma generate
npx prisma db push

# Dashboard
cd dashboard
npm install
```

### Running in watch mode:
```bash
# Backend (auto-rebuild on changes)
cd backend
npm run start:dev

# Dashboard (already in watch mode)
cd dashboard
npx next dev -p 3001
```

---

## Default Ports
- Backend API: **4000**
- Dashboard: **3001**
- PostgreSQL: **5432**
- Redis: **6379**

## Default Test Credentials
- Tenant ID: `test-tenant-1`
- Database: `app_db`
- DB User: `app_user`
- DB Password: `change_me`
