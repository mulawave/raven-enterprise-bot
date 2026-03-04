@echo off
setlocal

rem Use workspace-relative path for consistency
cd /d "Z:\REBASS\raven-enterprise-bot\backend"

echo Checking dependencies...
if not exist "node_modules" (
	echo Installing backend dependencies...
	call npm install
)

echo Ensuring build output exists...
if not exist "dist\apps\api\src\main.js" (
	echo Building API...
	call npm run build
)

if not exist "dist\apps\worker\main.js" (
	echo Building Worker...
	call npm run build:worker
)

echo Starting worker process in background...
start "Raven Worker" cmd /c "node dist\apps\worker\main.js & pause"

echo Starting backend API server...
node dist\apps\api\src\main.js

endlocal
pause
