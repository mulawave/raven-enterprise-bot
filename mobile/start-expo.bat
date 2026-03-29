@echo off
cd /d "%~dp0"
set PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools;%PATH%
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set EXPO_OFFLINE=1
npx expo start --port 8081 --clear --offline
pause
