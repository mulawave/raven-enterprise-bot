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
function Ok  { param([string]$Msg) Write-Host "  [OK] $Msg" -ForegroundColor Green }
function Err { param([string]$Msg) Write-Host "  [ERR] $Msg" -ForegroundColor Red; exit 1 }

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
        $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
        $null = npm install 2>&1
        if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $prev; Err "npm install failed for $Name" }
        $null = npm run build 2>&1
        if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $prev; Err "npm build failed for $Name" }
        $ErrorActionPreference = $prev
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
        $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
        $null = npm install 2>&1
        if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $prev; Err "npm install failed for backend" }
        # Re-create the Prisma .prisma junction (Windows: npm install can remove it)
        $junctionPath = "node_modules\@prisma\client\.prisma"
        if (-not (Test-Path $junctionPath)) {
            cmd /c mklink /J $junctionPath "node_modules\.prisma" 2>$null | Out-Null
        }
        $null = npx prisma generate 2>&1
        if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $prev; Err "prisma generate failed" }
        $null = npm run build:all 2>&1
        if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $prev; Err "npm build:all failed for backend" }
        $ErrorActionPreference = $prev
        Ok "backend built"
    } finally { Pop-Location }
}

# ── Step 3: SCP updated service files to server ──────────────────────────────
function Publish-Standalone {
    param([string]$Name, [string]$LocalDir, [string]$RemoteDir, [string]$Port, [string]$Pm2Name)

    Log "Packaging $Name .next build..."

    # Archive the full .next/ output (server + static bundles, everything except cache/standalone/types).
    # On the server, standalone/.next is the live Next.js output directory read by standalone/server.js.
    # We replace ONLY that directory — keeping server.js and node_modules from the existing deployment.
    $tarFile = "$env:TEMP\$Name-next-content.tar.gz"
    Push-Location "$Root\$LocalDir\.next"
    try {
        $items = Get-ChildItem -Name | Where-Object { $_ -notin @('standalone','cache','types') }
        tar --format=pax -czf $tarFile $items
        if ($LASTEXITCODE -ne 0) { Err "tar failed for $Name .next content" }
    } finally { Pop-Location }

    & scp $tarFile "raven-user:~/$Name-next-content.tar.gz"
    if ($LASTEXITCODE -ne 0) { Err "SCP failed for $Name" }
    Remove-Item $tarFile -ErrorAction SilentlyContinue

    # Also ship the public/ folder — Next.js standalone needs it at standalone/public/
    $publicDir = "$Root\$LocalDir\public"
    if (Test-Path $publicDir) {
        $pubTarFile = "$env:TEMP\$Name-public.tar.gz"
        Push-Location $publicDir
        try {
            tar --format=pax -czf $pubTarFile .
            if ($LASTEXITCODE -ne 0) { Err "tar failed for $Name public/" }
        } finally { Pop-Location }
        & scp $pubTarFile "raven-user:~/$Name-public.tar.gz"
        if ($LASTEXITCODE -ne 0) { Err "SCP failed for $Name public/" }
        Remove-Item $pubTarFile -ErrorAction SilentlyContinue
    }

    Ok "$Name uploaded"

    Log "Swapping $Name .next bundle on server..."
    if ($Pm2Name) {
        $remotePm2 = "pm2 restart $Pm2Name"
    } else {
        $remotePm2 = "pm2 restart raven-dashboard"
    }
    $remoteSwap = (@"
set -e
STANDALONE=$RemoteDir/.next/standalone
rm -rf /tmp/$Name-next-new
mkdir -p /tmp/$Name-next-new
tar -xzf ~/$Name-next-content.tar.gz -C /tmp/$Name-next-new 2>/dev/null
rm -rf "`$STANDALONE/.next_old"
mv "`$STANDALONE/.next" "`$STANDALONE/.next_old" 2>/dev/null || rm -rf "`$STANDALONE/.next"
mv /tmp/$Name-next-new "`$STANDALONE/.next"
rm -f ~/$Name-next-content.tar.gz
# Deploy public/ assets if uploaded
if [ -f ~/$Name-public.tar.gz ]; then
  mkdir -p "`$STANDALONE/public"
  tar -xzf ~/$Name-public.tar.gz -C "`$STANDALONE/public" 2>/dev/null
  rm -f ~/$Name-public.tar.gz
fi
$remotePm2
echo SWAPPED
"@).Replace("`r", "")
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    $swapOut = $remoteSwap | ssh raven-user bash 2>&1
    $sshEc = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($sshEc -ne 0) { Err "Remote swap failed for $Name (exit $sshEc)" }
    Ok "$Name deployed and restarted"
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

    # Ship package.json + package-lock.json so server-side npm install picks up new deps
    & scp "$Root\backend\package.json" "raven-user:~/backend-package.json"
    if ($LASTEXITCODE -ne 0) { Err "SCP failed for backend package.json" }
    if (Test-Path "$Root\backend\package-lock.json") {
        & scp "$Root\backend\package-lock.json" "raven-user:~/backend-package-lock.json"
    }

    # Also sync the prisma/migrations folder so new migrations are applied
    Log "Uploading prisma migrations to server..."
    $migrationsFile = "$env:TEMP\backend-migrations.tar.gz"
    Push-Location "$Root\backend\prisma"
    try {
        tar --format=pax -czf $migrationsFile migrations schema.prisma
        if ($LASTEXITCODE -ne 0) { Err "tar failed for prisma migrations" }
    } finally { Pop-Location }

    & scp $migrationsFile "raven-user:~/backend-migrations.tar.gz"
    if ($LASTEXITCODE -ne 0) { Err "SCP failed for prisma migrations archive" }
    Remove-Item $migrationsFile -ErrorAction SilentlyContinue

    Log "Extracting, migrating, and swapping backend..."
    $backendScript = (@'
set -e
cd ~/raven-enterprise-bot/backend
rm -rf dist_new
mkdir -p dist_new
tar -xzf ~/backend-dist.tar.gz -C dist_new 2>/dev/null
rm -rf dist_old
mv dist dist_old 2>/dev/null || true
mv dist_new dist
# Update package.json if a new one was uploaded
if [ -f ~/backend-package.json ]; then mv ~/backend-package.json package.json; fi
if [ -f ~/backend-package-lock.json ]; then mv ~/backend-package-lock.json package-lock.json; fi
npm install --production --silent 2>&1 | tail -3
tar -xzf ~/backend-migrations.tar.gz -C prisma 2>/dev/null
rm -f ~/backend-migrations.tar.gz
npx prisma migrate deploy --schema=prisma/schema.prisma
npx prisma generate --schema=prisma/schema.prisma
pm2 restart raven-api raven-worker
echo BACKEND_DONE
'@).Replace("`r", "")
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    $deployOut = $backendScript | ssh raven-user bash 2>&1
    $sshEc = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($sshEc -ne 0) { Err "Remote backend deploy failed (exit $sshEc)" }
    if ($deployOut -match "BACKEND_DONE") { Ok "Backend deployed and restarted" }
    else { Err "BACKEND_DONE not seen — deploy may have failed" }
}

if ($Service -eq "all" -or $Service -eq "admin") {
    Publish-Standalone `
        -Name       "admin-console" `
        -LocalDir   "admin-console" `
        -RemoteDir  "~/raven-enterprise-bot/admin-console" `
        -Port       "4012" `
        -Pm2Name    "raven-admin"
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
