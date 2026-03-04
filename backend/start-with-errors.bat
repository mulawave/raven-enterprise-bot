@echo off
cd /d Z:\REBASS\raven-enterprise-bot\backend
echo Current directory: %CD%
echo.
echo Starting backend server...
node dist\apps\api\src\main.js
echo.
echo Exit code: %ERRORLEVEL%
pause
