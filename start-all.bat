@echo off
echo ====================================
echo Starting Raven Admin Console Stack
echo ====================================
echo.

echo [1/4] Checking dependencies...
cd /d "%~dp0backend"
if not exist "node_modules" (
    echo Backend dependencies not found. Installing...
    call npm install
)

cd /d "%~dp0admin-console"
if not exist "node_modules" (
    echo Frontend dependencies not found. Installing...
    call npm install
)

echo.
echo [2/4] Starting PostgreSQL (ensure it's running)...
echo If PostgreSQL is not running, please start it manually
timeout /t 3 >nul

echo.
echo [3/4] Starting Backend Server...
cd /d "%~dp0backend"
start "Raven Backend" cmd /k "npm run start:dev"

timeout /t 5 >nul

echo.
echo [4/4] Starting Frontend Server...
cd /d "%~dp0admin-console"
start "Raven Admin Console" cmd /k "npm run dev"

echo.
echo ====================================
echo ✓ Both servers are starting!
echo ====================================
echo.
echo Backend: http://localhost:4000
echo Frontend: http://localhost:3000
echo Admin Console: http://localhost:3000/admin
echo.
echo Check the new terminal windows for server output
echo Press any key to exit this window...
pause >nul
