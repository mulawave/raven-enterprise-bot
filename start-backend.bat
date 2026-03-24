@echo off
cd /d "Z:\REBASS\raven-enterprise-bot\backend"
set DATABASE_URL=postgresql://app_user:change_me@localhost:5432/app_db
set REDIS_URL=redis://localhost:6379
set JWT_SECRET=dev-only-jwt-secret-replace-before-going-to-production-minimum-64-chars
set CORS_ORIGINS=http://localhost:4011,http://localhost:4012
set PORT=4000
set NODE_ENV=development
echo [Raven Backend] Starting on port 4000...
node dist\apps\api\src\main.js
