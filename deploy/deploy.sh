#!/usr/bin/env bash
# =============================================================================
# Raven Enterprise — INCREMENTAL DEPLOY
# Pulls latest code, rebuilds changed apps, and restarts Passenger.
#
# Run on the cPanel server as the ravenai user, or via GitHub Actions SSH.
# Redis runs as a user-space process compiled in ~/local/bin/redis-server
# =============================================================================
set -euo pipefail

REPO_DIR="${HOME}/raven-enterprise-bot"
DEPLOY_LOG="${REPO_DIR}/deploy/deploy.log"
REDIS_BIN="${HOME}/local/bin/redis-server"
REDIS_CLI="${HOME}/local/bin/redis-cli"
REDIS_CONF="${HOME}/redis.conf"
REDIS_PID="${HOME}/redis.pid"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$DEPLOY_LOG"; }

cd "$REPO_DIR"
log "Deploy started"

# ── Ensure Redis is running (user-space) ──────────────────────────────────────
if [[ -x "$REDIS_BIN" ]]; then
  if ! "$REDIS_CLI" ping 2>/dev/null | grep -q PONG; then
    log "Redis not running — starting..."
    "$REDIS_BIN" "$REDIS_CONF"
    sleep 1
    "$REDIS_CLI" ping | grep -q PONG && log "Redis started." || log "WARNING: Redis failed to start."
  fi
fi

# ── Pull latest ───────────────────────────────────────────────────────────────
log "Pulling latest from origin/main..."
git fetch origin
BEFORE="$(git rev-parse HEAD)"
git reset --hard origin/main
AFTER="$(git rev-parse HEAD)"

if [[ "$BEFORE" == "$AFTER" ]]; then
  log "No changes detected — deploy skipped."
  exit 0
fi

CHANGED="$(git diff --name-only "$BEFORE" "$AFTER")"
log "Changed files:"
echo "$CHANGED" | tee -a "$DEPLOY_LOG"

# ── Helper: touch Passenger restart file ─────────────────────────────────────
restart_app() {
  local dir="$1"
  mkdir -p "${REPO_DIR}/${dir}/tmp"
  touch "${REPO_DIR}/${dir}/tmp/restart.txt"
  log "Restarting Passenger for $dir"
}

# ── Backend ───────────────────────────────────────────────────────────────────
BACKEND_CHANGED=false
if echo "$CHANGED" | grep -qE '^backend/|^libs/|^shared/'; then
  BACKEND_CHANGED=true
fi

if $BACKEND_CHANGED; then
  log "Rebuilding backend..."
  cd "${REPO_DIR}/backend"
  npm ci --prefer-offline --omit=dev 2>&1 | tail -5
  npm run build:all 2>&1 | tail -10
  log "Running Prisma migrations..."
  npx prisma migrate deploy 2>&1 | tail -10
  restart_app backend
fi

# ── Dashboard ─────────────────────────────────────────────────────────────────
DASHBOARD_CHANGED=false
if echo "$CHANGED" | grep -qE '^dashboard/|^shared/'; then
  DASHBOARD_CHANGED=true
fi

if $DASHBOARD_CHANGED; then
  log "Rebuilding dashboard..."
  cd "${REPO_DIR}/dashboard"
  npm ci --prefer-offline 2>&1 | tail -5
  npm run build 2>&1 | tail -10
  cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
  [[ -d public ]] && cp -r public .next/standalone/public 2>/dev/null || true
  restart_app dashboard
fi

# ── Admin console ─────────────────────────────────────────────────────────────
ADMIN_CHANGED=false
if echo "$CHANGED" | grep -qE '^admin-console/|^shared/'; then
  ADMIN_CHANGED=true
fi

if $ADMIN_CHANGED; then
  log "Rebuilding admin console..."
  cd "${REPO_DIR}/admin-console"
  npm ci --prefer-offline 2>&1 | tail -5
  npm run build 2>&1 | tail -10
  cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
  [[ -d public ]] && cp -r public .next/standalone/public 2>/dev/null || true
  restart_app admin-console
fi

log "Deploy complete (${BEFORE:0:8} → ${AFTER:0:8})"
