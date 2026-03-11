#!/bin/bash
# quick-rebuild-admin.sh
# Rebuilds admin-console in-place on the server and restarts

set -e
ADMIN_DIR="$HOME/raven-enterprise-bot/admin-console"

echo "=== Quick rebuild admin-console ==="
cd "$ADMIN_DIR"

echo "Building..."
npm run build 2>&1 | tail -20

echo ""
echo "Updating standalone static assets..."
rm -rf .next/standalone/.next/static 2>/dev/null || true
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
echo "Static copy done"

echo ""
echo "Killing old process on port 4012..."
PID=$(ss -tlnp 2>/dev/null | grep ":4012" | grep -oP 'pid=\K[0-9]+' | head -1 || true)
if [ -n "$PID" ]; then
  kill -9 "$PID" && echo "Killed PID $PID"
fi

echo "Touching restart.txt..."
touch tmp/restart.txt

echo ""
echo "Waiting for restart (15s)..."
sleep 15

echo "Port 4012 status:"
ss -tlnp | grep 4012 || echo "not yet"

echo ""
echo "Testing /admin/login..."
RESP=$(curl -s --max-time 20 http://127.0.0.1:4012/admin/login 2>/dev/null)
echo "Build ID: $(echo "$RESP" | grep -o 'buildId...............' | head -1)"

echo ""
echo "Clearing nginx cache..."
rm -rf /var/cache/ea-nginx/proxy/ravenai/* 2>/dev/null && echo "Cache cleared" || echo "Would need root for cache clear"

echo "=== DONE ==="
