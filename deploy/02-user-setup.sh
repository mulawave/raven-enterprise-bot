#!/usr/bin/env bash
# =============================================================================
# Raven Enterprise — USER SETUP (runs entirely as ravenai — no root needed)
# After running deploy/01-root-db-setup.sh as root, SSH in as ravenai and run:
#
#   bash ~/raven-enterprise-bot/deploy/02-user-setup.sh
#
# This script:
#   1. Compiles Redis 7 into ~/local/  (no root, no system packages)
#   2. Sets up Redis config + @reboot cron
#   3. Validates .env files exist
#   4. Builds backend + both Next.js apps
#   5. Runs Prisma migrations
# =============================================================================
set -euo pipefail

HOME_DIR="$HOME"
REPO_DIR="$HOME_DIR/raven-enterprise-bot"
LOCAL_DIR="$HOME_DIR/local"
REDIS_VERSION="7.2.4"
REDIS_DATA_DIR="$HOME_DIR/redis-data"
REDIS_LOG="$HOME_DIR/redis.log"
REDIS_CONF="$HOME_DIR/redis.conf"
REDIS_PID="$HOME_DIR/redis.pid"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

echo "============================================"
echo " Raven Enterprise — User Setup"
echo " Running as: $(whoami) in $HOME_DIR"
echo "============================================"

# ── 1. Check build tools (already present on cPanel servers) ─────────────────
log "Checking build tools..."
for tool in gcc make; do
  if ! command -v $tool &>/dev/null; then
    echo "ERROR: '$tool' not found. Contact your host to ensure build tools are available."
    exit 1
  fi
done
log "gcc $(gcc --version | head -1 | grep -oP '\d+\.\d+\.\d+' | head -1), make $(make --version | head -1) — OK"

# ── 2. Compile Redis 7 into ~/local/ ──────────────────────────────────────────
REDIS_BIN="$LOCAL_DIR/bin/redis-server"

if [[ -x "$REDIS_BIN" ]] && "$REDIS_BIN" --version | grep -q "$REDIS_VERSION"; then
  log "Redis $REDIS_VERSION already compiled at $REDIS_BIN — skipping."
else
  log "Downloading Redis $REDIS_VERSION source..."
  REDIS_TMP="$HOME_DIR/redis-src"
  mkdir -p "$REDIS_TMP"
  cd "$REDIS_TMP"
  curl -fsSL "https://download.redis.io/releases/redis-${REDIS_VERSION}.tar.gz" \
    -o "redis-${REDIS_VERSION}.tar.gz"
  tar xzf "redis-${REDIS_VERSION}.tar.gz"

  log "Compiling Redis (this takes ~2 minutes)..."
  cd "redis-${REDIS_VERSION}"
  make -j"$(nproc)" MALLOC=libc 2>&1 | tail -5
  make install PREFIX="$LOCAL_DIR" 2>&1 | tail -3

  log "Redis compiled successfully: $("$REDIS_BIN" --version)"

  # Clean up source to save disk space
  cd "$HOME_DIR"
  rm -rf "$REDIS_TMP"
fi

# ── 3. Write Redis config ─────────────────────────────────────────────────────
mkdir -p "$REDIS_DATA_DIR"

cat > "$REDIS_CONF" <<REDISCONF
# Raven Enterprise Redis — all data in ~/redis-data, binds localhost only
bind 127.0.0.1
port 6379
daemonize yes
pidfile ${REDIS_PID}
logfile ${REDIS_LOG}
dir ${REDIS_DATA_DIR}
# AOF persistence — survives server restarts
appendonly yes
appendfsync everysec
# Memory safety
maxmemory 128mb
maxmemory-policy allkeys-lru
REDISCONF

log "Redis config written to $REDIS_CONF"

# ── 4. Start Redis now ────────────────────────────────────────────────────────
if [[ -f "$REDIS_PID" ]] && kill -0 "$(cat "$REDIS_PID")" 2>/dev/null; then
  log "Redis already running (pid $(cat "$REDIS_PID")) — skipping start."
else
  "$REDIS_BIN" "$REDIS_CONF"
  sleep 1
  "$LOCAL_DIR/bin/redis-cli" ping | grep -q PONG && log "Redis started and responding." || {
    echo "ERROR: Redis failed to start. Check $REDIS_LOG"
    exit 1
  }
fi

# ── 5. Add @reboot cron entry ─────────────────────────────────────────────────
CRON_LINE="@reboot ${REDIS_BIN} ${REDIS_CONF}"
if crontab -l 2>/dev/null | grep -qF "$REDIS_BIN"; then
  log "Redis @reboot cron already present — skipping."
else
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  log "Added @reboot cron: $CRON_LINE"
fi

# ── 6. Validate .env files ────────────────────────────────────────────────────
log "Checking .env files..."
MISSING_ENV=false
for APP_ENV in backend/.env dashboard/.env admin-console/.env; do
  if [[ ! -f "$REPO_DIR/$APP_ENV" ]]; then
    echo "  MISSING: $REPO_DIR/$APP_ENV"
    MISSING_ENV=true
  else
    echo "  OK: $APP_ENV"
  fi
done

if $MISSING_ENV; then
  echo ""
  echo "ERROR: One or more .env files are missing."
  echo "  Copy deploy/production-env-template.env and fill in values."
  echo "  The DATABASE_URL was printed by deploy/01-root-db-setup.sh"
  echo ""
  echo "  Minimum required for backend/.env:"
  echo "    DATABASE_URL=postgresql://ravenai_db:<password>@127.0.0.1:5432/ravenai_prod"
  echo "    REDIS_URL=redis://127.0.0.1:6379"
  echo "    JWT_SECRET=<64+ chars>"
  echo "    META_APP_SECRET=<from Meta>"
  echo "    PAYSTACK_SECRET_KEY=sk_live_<key>"
  echo "    CORS_ORIGINS=https://app.raven-ai.online,https://admin.raven-ai.online"
  echo "    NODE_ENV=production"
  exit 1
fi

# ── 7. Backend — install + build + migrate ────────────────────────────────────
log "Building backend..."
cd "$REPO_DIR/backend"
npm ci --prefer-offline
npm run build:all
log "Running Prisma migrations..."
npx prisma migrate deploy
mkdir -p tmp
log "Backend done."

# ── 8. Dashboard — install + build ───────────────────────────────────────────
log "Building dashboard..."
cd "$REPO_DIR/dashboard"
npm ci --prefer-offline
npm run build
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
[[ -d public ]] && cp -r public .next/standalone/public 2>/dev/null || true
mkdir -p tmp
log "Dashboard done."

# ── 9. Admin console — install + build ───────────────────────────────────────
log "Building admin console..."
cd "$REPO_DIR/admin-console"
npm ci --prefer-offline
npm run build
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
[[ -d public ]] && cp -r public .next/standalone/public 2>/dev/null || true
mkdir -p tmp
log "Admin console done."

echo ""
echo "============================================"
echo " Setup complete!"
echo " Redis:          running on 127.0.0.1:6379"
echo " Redis data:     $REDIS_DATA_DIR"
echo " All apps built: $REPO_DIR"
echo ""
echo " Next steps:"
echo "  1. In cPanel: Software → Setup Node.js App → create 3 apps"
echo "     See deploy/cpanel-setup.md for exact settings"
echo "  2. Seed super-admin:"
echo "     cd $REPO_DIR/backend && npx ts-node prisma/seed-super-admin.ts"
echo "============================================"
