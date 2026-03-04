#!/usr/bin/env bash
# =============================================================================
# Raven Enterprise — FIRST DEPLOY
# Run once as the cPanel user (not root) after 01-server-setup.sh completes.
#
# Usage (SSH in as cPanel user):
#   bash ~/raven-enterprise-bot/deploy/02-first-deploy.sh
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-git@github.com:YOUR_ORG/raven-enterprise-bot.git}"
HOME_DIR="$HOME"
REPO_DIR="$HOME_DIR/raven-enterprise-bot"
NODE_BIN="/usr/local/bin"   # adjust if EA4 node is elsewhere

echo "============================================"
echo " Raven Enterprise — First Deploy"
echo "============================================"

# ── Resolve Node binary from EasyApache ──────────────────────────────────────
# cPanel sets node path when using "Setup Node.js App" — find it
if command -v node &>/dev/null; then
  NODE_BIN="$(dirname "$(command -v node)")"
fi
echo "Using node: $(node --version)  npm: $(npm --version)  at $NODE_BIN"

# ── Clone repo ────────────────────────────────────────────────────────────────
if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo ">>> Cloning repository..."
  git clone "$REPO_URL" "$REPO_DIR"
else
  echo ">>> Repository already cloned."
fi

cd "$REPO_DIR"

# ── Validate .env files exist ────────────────────────────────────────────────
for APP_ENV in backend/.env dashboard/.env admin-console/.env; do
  if [[ ! -f "$REPO_DIR/$APP_ENV" ]]; then
    echo ""
    echo "ERROR: $APP_ENV not found."
    echo "  Copy env.example to each app directory and fill in values."
    echo "  See deploy/production-env-template.env for the required variables."
    exit 1
  fi
done

# ── Backend build ─────────────────────────────────────────────────────────────
echo ">>> Building backend..."
cd "$REPO_DIR/backend"
npm ci --prefer-offline
npm run build:all
echo ">>> Running Prisma migrations..."
npx prisma migrate deploy
mkdir -p tmp

# ── Dashboard build ───────────────────────────────────────────────────────────
echo ">>> Building dashboard..."
cd "$REPO_DIR/dashboard"
npm ci --prefer-offline
npm run build
# Copy static assets into standalone directory
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
if [[ -d public ]]; then
  cp -r public .next/standalone/public 2>/dev/null || true
fi
mkdir -p tmp

# ── Admin console build ───────────────────────────────────────────────────────
echo ">>> Building admin console..."
cd "$REPO_DIR/admin-console"
npm ci --prefer-offline
npm run build
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
if [[ -d public ]]; then
  cp -r public .next/standalone/public 2>/dev/null || true
fi
mkdir -p tmp

echo ""
echo "============================================"
echo " First deploy complete."
echo ""
echo " Next: In cPanel → Software → Setup Node.js App"
echo "       Create 3 apps (see deploy/cpanel-setup.md)"
echo "============================================"
