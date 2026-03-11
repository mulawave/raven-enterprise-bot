#!/usr/bin/env bash
# =============================================================================
# Raven Enterprise — ARTIFACT DEPLOY
# Deploys a release archive to the cPanel server without relying on git.
#
# Usage:
#   bash ~/raven-deploy.sh ~/raven-deploy.tar.gz
#   bash deploy/deploy.sh ./raven-deploy.tar.gz
#
# The script stages the uploaded archive, restores production env files and
# uploads, builds everything in staging, then swaps the release into place.
# =============================================================================
set -euo pipefail

ARCHIVE_PATH="${1:-${DEPLOY_ARCHIVE_PATH:-${HOME}/raven-deploy.tar.gz}}"
APP_DIR="${HOME}/raven-enterprise-bot"
STAGING_DIR="${HOME}/raven-enterprise-bot.staging.$$"
BACKUP_DIR="${HOME}/raven-enterprise-bot.backup.$(date +%Y%m%d-%H%M%S)"
STATE_DIR="${HOME}/.raven-deploy-state.$$"
DEPLOY_LOG="${HOME}/raven-deploy.log"
KEEP_BACKUP="${KEEP_BACKUP:-false}"
REDIS_BIN="${HOME}/local/bin/redis-server"
REDIS_CLI="${HOME}/local/bin/redis-cli"
REDIS_CONF="${HOME}/redis.conf"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$DEPLOY_LOG"; }

cleanup() {
  rm -rf "$STAGING_DIR" "$STATE_DIR"
}

trap cleanup EXIT

backup_file() {
  local relative_path="$1"
  if [[ -f "${APP_DIR}/${relative_path}" ]]; then
    mkdir -p "${STATE_DIR}/$(dirname "${relative_path}")"
    cp "${APP_DIR}/${relative_path}" "${STATE_DIR}/${relative_path}"
  fi
}

restore_file() {
  local relative_path="$1"
  if [[ -f "${STATE_DIR}/${relative_path}" ]]; then
    mkdir -p "${STAGING_DIR}/$(dirname "${relative_path}")"
    cp "${STATE_DIR}/${relative_path}" "${STAGING_DIR}/${relative_path}"
  fi
}

restart_app() {
  local dir="$1"
  local port="$2"
  mkdir -p "${APP_DIR}/${dir}/tmp"
  touch "${APP_DIR}/${dir}/tmp/restart.txt"
  # Force-kill any existing next-server on this port so Passenger spawns fresh
  if [[ -n "${port:-}" ]]; then
    local pid
    pid=$(ss -tlnp 2>/dev/null | grep ":${port}" | grep -oP 'pid=\K[0-9]+' | head -1 || true)
    if [[ -n "$pid" ]]; then
      kill -9 "$pid" 2>/dev/null && log "Killed old process PID=${pid} on port ${port}" || true
    fi
  fi
  log "Restarted Passenger for ${dir}"
}

# Clear nginx proxy cache so stale pre-deploy responses are purged
clear_nginx_cache() {
  local cache_dir="/var/cache/ea-nginx/proxy/ravenai"
  if [[ -d "$cache_dir" ]]; then
    rm -rf "${cache_dir:?}"/* 2>/dev/null && log "Nginx cache cleared" || log "WARNING: Could not clear nginx cache (permission denied)"
  fi
}

log "Artifact deploy started"

if [[ ! -f "$ARCHIVE_PATH" ]]; then
  log "ERROR: Deployment archive not found at ${ARCHIVE_PATH}"
  exit 1
fi

mkdir -p "$STATE_DIR"

# ── Ensure Redis is running (user-space) ──────────────────────────────────────
if [[ -x "$REDIS_BIN" ]]; then
  if ! "$REDIS_CLI" ping 2>/dev/null | grep -q PONG; then
    log "Redis not running — starting..."
    "$REDIS_BIN" "$REDIS_CONF"
    sleep 1
    "$REDIS_CLI" ping | grep -q PONG && log "Redis started." || log "WARNING: Redis failed to start."
  fi
fi

# ── Preserve production-only files ────────────────────────────────────────────
backup_file "backend/.env"
backup_file "dashboard/.env"
backup_file "admin-console/.env"

if [[ -d "${APP_DIR}/backend/uploads" ]]; then
  mkdir -p "${STATE_DIR}/backend"
  cp -a "${APP_DIR}/backend/uploads" "${STATE_DIR}/backend/uploads"
fi

# ── Stage incoming release ────────────────────────────────────────────────────
mkdir -p "$STAGING_DIR"
tar -xzf "$ARCHIVE_PATH" -C "$STAGING_DIR"
rm -rf "${STAGING_DIR}/.git"

restore_file "backend/.env"
restore_file "dashboard/.env"
restore_file "admin-console/.env"

rm -f "${STAGING_DIR}/backend/.env.local"
rm -f "${STAGING_DIR}/dashboard/.env.local"
rm -f "${STAGING_DIR}/admin-console/.env.local"

if [[ -d "${STATE_DIR}/backend/uploads" ]]; then
  mkdir -p "${STAGING_DIR}/backend"
  rm -rf "${STAGING_DIR}/backend/uploads"
  cp -a "${STATE_DIR}/backend/uploads" "${STAGING_DIR}/backend/uploads"
fi

for required_env in backend/.env dashboard/.env admin-console/.env; do
  if [[ ! -f "${STAGING_DIR}/${required_env}" ]]; then
    log "ERROR: Missing required env file ${required_env} in staged release."
    exit 1
  fi
done

# ── Build release in staging ──────────────────────────────────────────────────
log "Building backend in staging..."
cd "${STAGING_DIR}/backend"
npm ci --prefer-offline
npm run build:all
log "Running Prisma migrations..."
npx prisma migrate deploy
mkdir -p tmp

log "Building dashboard in staging..."
cd "${STAGING_DIR}/dashboard"
npm ci --prefer-offline
npm run build
# Copy static assets — symlinks break when staging dir is renamed to APP_DIR
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
[[ -d public ]] && cp -r public .next/standalone/public 2>/dev/null || true
mkdir -p tmp

log "Building admin console in staging..."
cd "${STAGING_DIR}/admin-console"
npm ci --prefer-offline
npm run build
# Copy static assets — symlinks break when staging dir is renamed to APP_DIR
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
[[ -d public ]] && cp -r public .next/standalone/public 2>/dev/null || true
mkdir -p tmp

# ── Swap staged release into place ────────────────────────────────────────────
if [[ -d "$APP_DIR" ]]; then
  mv "$APP_DIR" "$BACKUP_DIR"
fi
mv "$STAGING_DIR" "$APP_DIR"
STAGING_DIR=""

restart_app backend "" 
restart_app dashboard "4011"
restart_app admin-console "4012"

clear_nginx_cache

rm -f "$ARCHIVE_PATH"

if [[ "$KEEP_BACKUP" == "true" ]]; then
  log "Deploy complete. Backup retained at ${BACKUP_DIR}"
else
  rm -rf "$BACKUP_DIR"
  log "Deploy complete. Previous release removed."
fi
