# =============================================================================
# Raven Enterprise — DEPLOY TO PRODUCTION
# Windows PowerShell deploy script. Builds locally where needed, packages
# changed source, SCPs to server and runs the remote deploy pipeline.
#
# Prerequisites:
#   - SSH config: raven-user (app server), raven-server (root, for nginx cache)
#   - Node 20+ installed locally (for 'npm run build' if --build flag passed)
#
# Usage:
#   .\scripts\deploy-to-prod.ps1                  # deploy all changed services
#   .\scripts\deploy-to-prod.ps1 -Service admin   # deploy only admin-console
#   .\scripts\deploy-to-prod.ps1 -Service dash    # deploy only dashboard
#   .\scripts\deploy-to-prod.ps1 -Service api     # deploy only backend
#   .\scripts\deploy-to-prod.ps1 -Snapshot        # create new stable snapshot
# =============================================================================
param(
    [ValidateSet("all","admin","dash","api")]
    [string]$Service = "all",
    [switch]$Snapshot
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Log { param([string]$Msg) Write-Host "[$Timestamp] $Msg" -ForegroundColor Cyan }
function Ok  { param([string]$Msg) Write-Host "  ✓ $Msg" -ForegroundColor Green }
function Err { param([string]$Msg) Write-Host "  ✗ $Msg" -ForegroundColor Red; exit 1 }

Log "Raven Enterprise Deploy — target: $Service"

# ── Step 1: Verify SSH connectivity ──────────────────────────────────────────
Log "Checking SSH connectivity..."
$sshTest = ssh raven-user 'echo OK' 2>&1
if ($sshTest -notmatch "OK") { Err "SSH to raven-user failed. Check your SSH config." }
Ok "SSH connected"

# ── Step 2: Build services that need it ──────────────────────────────────────
function Invoke-ServiceBuild {
    param([string]$Name, [string]$Dir)
    Log "Building $Name..."
    Push-Location "$Root\$Dir"
    try {
        npm ci --prefer-offline 2>&1 | Out-Null
        npm run build 2>&1 | Select-FilteredOutput
        # Copy static assets into standalone so they serve correctly
        if (Test-Path ".next\standalone") {
            if (Test-Path ".next\static") {
                Copy-Item -Recurse -Force ".next\static" ".next\standalone\.next\static"
            }
            if (Test-Path "public") {
                Copy-Item -Recurse -Force "public" ".next\standalone\public"
            }
        }
        Ok "$Name built"
    } finally {
        Pop-Location
    }
}

function Select-FilteredOutput {
    process { if ($_ -match "error|Error|ERROR") { Write-Host "  $_" -ForegroundColor Yellow } }
}

if ($Service -eq "all" -or $Service -eq "admin") { Invoke-ServiceBuild "admin-console" "admin-console" }
if ($Service -eq "all" -or $Service -eq "dash")  { Invoke-ServiceBuild "dashboard"     "dashboard" }
if ($Service -eq "all" -or $Service -eq "api") {
    Log "Building backend..."
    Push-Location "$Root\backend"
    try {
        npm ci --prefer-offline 2>&1 | Out-Null
        npm run build:all 2>&1 | Select-FilteredOutput
        Ok "backend built"
    } finally { Pop-Location }
}

# ── Step 3: SCP updated service files to server ──────────────────────────────
function Publish-Standalone {
    param([string]$Name, [string]$LocalDir, [string]$RemoteDir, [string]$Port, [string]$Pm2Name)

    Log "Uploading $Name standalone to server (tar archive)..."

    # Use tar to avoid SCP disconnects with thousands of small node_modules files
    $tarFile = "$env:TEMP\$Name-standalone.tar.gz"
    Push-Location "$Root\$LocalDir\.next"
    try {
        tar --format=pax -czf $tarFile standalone
        if ($LASTEXITCODE -ne 0) { Err "tar failed for $Name standalone" }
    } finally { Pop-Location }

    & scp $tarFile "raven-user:~/$Name-standalone.tar.gz"
    if ($LASTEXITCODE -ne 0) { Err "SCP failed for $Name" }
    Remove-Item $tarFile -ErrorAction SilentlyContinue
    Ok "$Name uploaded"

    Log "Atomically swapping $Name on server..."
    ssh raven-user @"
set -e
rm -rf /tmp/${Name}-standalone-new
mkdir -p /tmp/${Name}-standalone-new
tar -xzf ~/${Name}-standalone.tar.gz -C /tmp/${Name}-standalone-new
cd $RemoteDir/.next
rm -rf standalone_old
mv standalone standalone_old 2>/dev/null || true
mv /tmp/${Name}-standalone-new/standalone .
echo SWAPPED
"@ 2>&1 | Out-Null
    Ok "$Name swapped"

    # Restart
    if ($Pm2Name) {
        Log "Restarting $Name via PM2..."
        ssh raven-user "pm2 restart $Pm2Name" 2>&1 | Out-Null
        Ok "$Name PM2 restarted"
    } else {
        Log "Restarting $Name via port kill..."
        ssh raven-user @"
pid=\$(ss -tlnp 2>/dev/null | grep ':$Port' | grep -oP 'pid=\K[0-9]+' | head -1 || true)
[[ -n "\$pid" ]] && kill -9 "\$pid" && echo "Killed PID \$pid" || echo "No process on $Port"
mkdir -p $RemoteDir/tmp
touch $RemoteDir/tmp/restart.txt
echo RESTARTED
"@ 2>&1 | Select-String "Killed|RESTARTED" | ForEach-Object { Ok $_.Line }
    }
}

function Publish-Backend {
    Log "Uploading backend dist to server (tar archive)..."

    # Use tar to avoid SCP disconnects with many small files
    $tarFile = "$env:TEMP\backend-dist.tar.gz"
    Push-Location "$Root\backend\dist"
    try {
        tar --format=pax -czf $tarFile .
        if ($LASTEXITCODE -ne 0) { Err "tar failed for backend dist" }
    } finally { Pop-Location }

    & scp $tarFile "raven-user:~/backend-dist.tar.gz"
    if ($LASTEXITCODE -ne 0) { Err "SCP failed for backend dist archive" }
    Remove-Item $tarFile -ErrorAction SilentlyContinue

    Log "Extracting, migrating, and swapping backend..."
    ssh raven-user @'
set -e
cd ~/raven-enterprise-bot/backend
rm -rf dist_new
mkdir -p dist_new
tar -xzf ~/backend-dist.tar.gz -C dist_new
rm -rf dist_old
mv dist dist_old 2>/dev/null || true
mv dist_new dist
npx prisma migrate deploy --schema=prisma/schema.prisma
pm2 restart raven-api raven-worker
echo BACKEND_DONE
'@ 2>&1 | Select-String "BACKEND_DONE|error|Error" | ForEach-Object { Write-Host "  $_" }
    Ok "Backend deployed and restarted"
}

if ($Service -eq "all" -or $Service -eq "admin") {
    Publish-Standalone `
        -Name       "admin-console" `
        -LocalDir   "admin-console" `
        -RemoteDir  "~/raven-enterprise-bot/admin-console" `
        -Port       "4012" `
        -Pm2Name    ""
}
if ($Service -eq "all" -or $Service -eq "dash") {
    Publish-Standalone `
        -Name       "dashboard" `
        -LocalDir   "dashboard" `
        -RemoteDir  "~/raven-enterprise-bot/dashboard" `
        -Port       "4011" `
        -Pm2Name    "raven-dashboard"
}
if ($Service -eq "all" -or $Service -eq "api") {
    Publish-Backend
}

# ── Step 4: Clear nginx cache ─────────────────────────────────────────────────
Log "Clearing nginx cache (requires raven-server root SSH)..."
$cacheResult = ssh raven-server 'rm -rf /var/cache/ea-nginx/proxy/ravenai/* && echo CLEARED' 2>&1
if ($cacheResult -match "CLEARED") { Ok "Nginx cache cleared" }
else { Write-Host "  ⚠ Nginx cache clear failed (non-fatal): $cacheResult" -ForegroundColor Yellow }

# ── Step 5: Smoke test ────────────────────────────────────────────────────────
Log "Running smoke tests..."
Start-Sleep -Seconds 15

if ($Service -eq "all" -or $Service -eq "admin") {
    $adminRedirect = curl.exe -sI "https://admin.raven-ai.online/admin" 2>&1 | Select-String "location:"
    if ($adminRedirect -match "admin/login") { Ok "admin redirect: OK ($adminRedirect)" }
    else { Write-Host "  ⚠ Admin redirect unexpected: $adminRedirect" -ForegroundColor Yellow }
}
if ($Service -eq "all" -or $Service -eq "dash") {
    $dashStatus = curl.exe -sI "https://app.raven-ai.online/" 2>&1 | Select-String "HTTP/"
    if ($dashStatus -match "200") { Ok "dashboard: 200 OK" }
    else { Write-Host "  ⚠ Dashboard: $dashStatus" -ForegroundColor Yellow }
}
if ($Service -eq "all" -or $Service -eq "api") {
    $apiHealth = curl.exe -s "https://api.raven-ai.online/health" 2>&1
    if ($apiHealth -match "ok|healthy") { Ok "API health: OK" }
    else { Write-Host "  ⚠ API health: $apiHealth" -ForegroundColor Yellow }
}

# ── Step 6: Optional — create new stable snapshot ────────────────────────────
if ($Snapshot) {
    $snapDate = Get-Date -Format "yyyy-MM-dd"
    Log "Creating new stable snapshot (stable-$snapDate)..."
    ssh raven-user @"
SNAP=~/snapshots/stable-$snapDate
mkdir -p `$SNAP
cp -r ~/raven-enterprise-bot/admin-console/.next/standalone `$SNAP/admin-standalone
cp -r ~/raven-enterprise-bot/dashboard/.next/standalone `$SNAP/dashboard-standalone
pm2 save
cp ~/.pm2/dump.pm2 `$SNAP/pm2-dump.pm2 2>/dev/null || true
echo "admin: `$(cat ~/raven-enterprise-bot/admin-console/.next/BUILD_ID)" > `$SNAP/BUILD_IDS.txt
echo "dashboard: `$(cat ~/raven-enterprise-bot/dashboard/.next/BUILD_ID)" >> `$SNAP/BUILD_IDS.txt
echo "date: `$(date -u)" >> `$SNAP/BUILD_IDS.txt
echo SNAPSHOT_DONE
cat `$SNAP/BUILD_IDS.txt
"@ 2>&1 | Select-String "SNAPSHOT_DONE|admin:|dashboard:|date:" | ForEach-Object { Ok $_.Line }
}

Log "Deploy complete."
