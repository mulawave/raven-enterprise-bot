#!/usr/bin/env bash
# =============================================================================
# Raven Enterprise — RESTORE STABLE SNAPSHOT
# Rolls back to the stable-2026-03-11 snapshot in one command.
#
# Usage (on server as ravenai):
#   bash ~/raven-enterprise-bot/deploy/restore-stable.sh
# =============================================================================
set -euo pipefail

SNAP="$HOME/snapshots/stable-2026-03-11"
APP="$HOME/raven-enterprise-bot"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

if [[ ! -d "$SNAP" ]]; then
  log "ERROR: Snapshot not found at $SNAP"
  log "Run the snapshot command first to create it."
  exit 1
fi

log "Starting rollback to stable-2026-03-11..."
log "Snapshot build IDs:"
cat "$SNAP/BUILD_IDS.txt"

log "Stopping PM2 dashboard..."
pm2 stop raven-dashboard 2>/dev/null || true

log "Killing any process on port 4012 (admin Passenger)..."
pid=$(ss -tlnp 2>/dev/null | grep ":4012" | grep -oP 'pid=\K[0-9]+' | head -1 || true)
[[ -n "$pid" ]] && kill -9 "$pid" && log "Killed PID $pid on port 4012" || log "No process on 4012"

log "Restoring dashboard standalone..."
rm -rf "$APP/dashboard/.next/standalone"
cp -r "$SNAP/dashboard-standalone" "$APP/dashboard/.next/standalone"

log "Restoring admin-console standalone..."
rm -rf "$APP/admin-console/.next/standalone"
cp -r "$SNAP/admin-standalone" "$APP/admin-console/.next/standalone"

log "Restarting dashboard via PM2..."
pm2 restart raven-dashboard

log "Restarting admin-console via Passenger restart.txt..."
mkdir -p "$APP/admin-console/tmp"
touch "$APP/admin-console/tmp/restart.txt"

log "Clearing nginx cache (requires root — attempting)..."
rm -rf /var/cache/ea-nginx/proxy/ravenai/* 2>/dev/null \
  && log "Nginx cache cleared" \
  || log "WARNING: Nginx cache needs root. Run: ssh raven-server 'rm -rf /var/cache/ea-nginx/proxy/ravenai/*'"

log "Waiting 20s for services to come up..."
sleep 20

log "Verifying ports..."
ss -tlnp | grep -E "4011|4012" || log "WARNING: expected ports not listening yet"

log "Verifying build IDs..."
LIVE_ADMIN=$(curl -s http://127.0.0.1:4012/admin/login 2>/dev/null | grep -o '"buildId":"[^"]*"' | head -1 || echo "no response")
LIVE_DASH=$(curl -s http://127.0.0.1:4011/ 2>/dev/null | grep -o '"buildId":"[^"]*"' | head -1 || echo "no response")
log "Admin build: $LIVE_ADMIN"
log "Dashboard build: $LIVE_DASH"

log "Rollback complete."
