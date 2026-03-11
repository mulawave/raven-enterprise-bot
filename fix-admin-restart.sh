#!/bin/bash
# fix-admin-restart.sh
# Forces admin-console next-server to restart with the current build

set -e

ADMIN_DIR="$HOME/raven-enterprise-bot/admin-console"
echo "=== Step 1: Finding process on port 4012 ==="
PID=$(ss -tlnp | grep 4012 | grep -oP 'pid=\K[0-9]+' | head -1)
if [ -n "$PID" ]; then
  echo "Found process PID=$PID on port 4012"
  echo "Killing PID $PID..."
  kill -9 "$PID" 2>/dev/null && echo "Killed" || echo "Could not kill (may need root)"
else
  echo "No process found on port 4012"
fi

echo ""
echo "=== Step 2: Verify disk state ==="
echo "BUILD_ID: $(cat $ADMIN_DIR/.next/BUILD_ID 2>/dev/null || echo MISSING)"
echo "Standalone BUILD_ID: $(cat $ADMIN_DIR/.next/standalone/.next/BUILD_ID 2>/dev/null || echo MISSING)"
echo "login.html main: $(ls $ADMIN_DIR/.next/server/app/admin/login.html 2>/dev/null || echo missing)"
echo "login.html standalone: $(ls $ADMIN_DIR/.next/standalone/.next/server/app/admin/login.html 2>/dev/null || echo missing)"
echo "Standalone static login chunk: $(ls $ADMIN_DIR/.next/standalone/.next/static/chunks/app/admin/login/ 2>/dev/null || echo MISSING)"

echo ""
echo "=== Step 3: Ensure static assets are linked/present in standalone ==="
# Next standalone output doesn't always copy .next/static — it may need a symlink
STANDALONE_STATIC="$ADMIN_DIR/.next/standalone/.next/static"
MAIN_STATIC="$ADMIN_DIR/.next/static"
if [ -L "$STANDALONE_STATIC" ]; then
  echo "Standalone static is already a symlink"
  ls -la "$STANDALONE_STATIC"
elif [ -d "$STANDALONE_STATIC" ]; then
  echo "Standalone static is a real directory — replacing with symlink for freshness"
  rm -rf "$STANDALONE_STATIC"
  ln -sfn "$MAIN_STATIC" "$STANDALONE_STATIC"
  echo "Symlinked $MAIN_STATIC -> $STANDALONE_STATIC"
else
  echo "Standalone static missing — creating symlink"
  ln -sfn "$MAIN_STATIC" "$STANDALONE_STATIC"
  echo "Symlinked $MAIN_STATIC -> $STANDALONE_STATIC"
fi

echo ""
echo "=== Step 4: Touch Passenger restart.txt ==="
touch "$ADMIN_DIR/tmp/restart.txt"
echo "Touched restart.txt at $(date)"

echo ""
echo "=== Step 5: Wait for Passenger to restart and test ==="
sleep 5

echo "Port 4012 status:"
ss -tlnp | grep 4012 || echo "Port 4012 not listening yet"

echo ""
echo "Testing localhost:4012/admin/login..."
RESP=$(curl -s --max-time 15 http://127.0.0.1:4012/admin/login 2>/dev/null)
if [ -z "$RESP" ]; then
  echo "WARNING: No response from localhost:4012 after 5s — Passenger may still be starting"
  sleep 10
  RESP=$(curl -s --max-time 15 http://127.0.0.1:4012/admin/login 2>/dev/null)
fi

NEW_BUILD=$(echo "$RESP" | grep -o '"buildId":"[^"]*"' | head -1)
echo "Live buildId from localhost: $NEW_BUILD"

EXPECTED_BUILD=$(cat $ADMIN_DIR/.next/BUILD_ID 2>/dev/null)
echo "Expected buildId: $EXPECTED_BUILD"

if echo "$NEW_BUILD" | grep -q "$EXPECTED_BUILD"; then
  echo ""
  echo "SUCCESS: App is serving the new build!"
else
  echo ""
  echo "WARNING: Build ID mismatch or app not responding yet"
  echo "Response start: $(echo "$RESP" | head -c 500)"
fi

echo ""
echo "=== Step 6: Clear nginx proxy cache ==="
CACHE_DIR="/var/cache/ea-nginx/proxy/ravenai"
if [ -d "$CACHE_DIR" ]; then
  echo "Clearing nginx cache at $CACHE_DIR..."
  rm -rf "${CACHE_DIR:?}"/* 2>/dev/null && echo "Cache cleared" || echo "Permission denied (may need root)"
else
  echo "Cache dir not found at $CACHE_DIR"
fi

echo ""
echo "=== DONE ==="
