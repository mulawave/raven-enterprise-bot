Set-Location "z:\REBASS\raven-enterprise-bot\backend"

$env:DATABASE_URL = "postgresql://app_user:change_me@localhost:5432/app_db"
$env:REDIS_URL = "redis://localhost:6379"
$env:JWT_SECRET = "dev-only-jwt-secret-replace-before-going-to-production-minimum-64-chars"
$env:CORS_ORIGINS = "http://localhost:3000,http://localhost:3001"
$env:PORT = "4000"
$env:NODE_ENV = "development"

Write-Host "Starting Raven Backend on port 4000..."

$proc = Start-Process -PassThru -NoNewWindow `
  -FilePath "node" `
  -ArgumentList "dist/apps/api/src/main.js" `
  -RedirectStandardOutput "$env:TEMP\backend.log" `
  -RedirectStandardError  "$env:TEMP\backend_err.log"

Write-Host "Backend PID: $($proc.Id)"
Write-Host "Logs: $env:TEMP\backend.log"
