@echo off
echo ========================================
echo Raven Enterprise Platform - Dev Start
echo ========================================
echo.

echo [1/5] Killing zombie ports...
powershell -ExecutionPolicy Bypass -File scripts/kill-ports.ps1

echo.
echo [2/5] Cleaning Next.js cache...
powershell -ExecutionPolicy Bypass -File scripts/clean-next.ps1

echo.
echo [3/5] Starting Docker services (postgres, redis)...
docker compose -f docker/docker-compose.yml up -d postgres redis
if errorlevel 1 goto error

echo Waiting for postgres to be ready...
timeout /t 5 >nul

echo.
echo [4/5] Starting backend API on port 4000...
start "Raven Backend" cmd /k "cd backend && node dist\apps\api\src\main.js"
timeout /t 8 >nul
powershell -ExecutionPolicy Bypass -File scripts/wait-for-backend.ps1
if errorlevel 1 (
  echo.
  echo ERROR: Backend failed to start. Check the "Raven Backend" window for errors.
  goto error
)

echo.
echo [5/5] Starting frontends...
start "Raven Admin Console" cmd /k "cd admin-console && npm run dev"
timeout /t 2 >nul
start "Raven Dashboard" cmd /k "cd dashboard && npm run dev"

echo.
echo ========================================
echo All services started!
echo.
echo   Backend:        http://localhost:4000
echo   Admin Console:  http://localhost:3001
echo   Dashboard:      http://localhost:3000
echo.
echo Login: admin@raven.ai / SuperAdmin123!
echo ========================================
echo.
pause >nul
exit /b 0

:error
echo.
echo ========================================
echo ERROR: Startup failed
echo ========================================
pause
exit /b 1
