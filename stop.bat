@echo off
echo ========================================
echo Stopping Raven Enterprise Platform
echo ========================================
echo.

echo Killing zombie ports...
powershell -ExecutionPolicy Bypass -File scripts/kill-ports.ps1

echo.
echo Stopping Docker services...
docker compose -f docker/docker-compose.yml down

echo.
echo All services stopped!
pause
