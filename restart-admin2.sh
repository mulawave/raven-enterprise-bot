#!/bin/bash
set -e
ADMIN_DIR=~/raven-enterprise-bot/admin-console

echo "Copying static assets..."
cp -r $ADMIN_DIR/.next/static $ADMIN_DIR/.next/standalone/.next/static 2>/dev/null || true

echo "Killing old process on 4012..."
PID=$(ss -tlnp 2>/dev/null | grep ':4012' | grep -oP 'pid=\K[0-9]+' | head -1 || true)
if [ -n "$PID" ]; then
  kill -9 "$PID" && echo "Killed $PID"
fi

sleep 3
touch $ADMIN_DIR/tmp/restart.txt
echo "Restart triggered"

sleep 20
echo "Port 4012:"
ss -tlnp | grep 4012 || echo "not listening yet"

echo "Testing /admin/login buildId..."
curl -s --max-time 15 http://127.0.0.1:4012/admin/login | grep -o '"buildId":"[^"]*"' | head -1

echo "Testing /admin/ redirect header..."
curl -s -I --max-time 10 http://127.0.0.1:4012/admin 2>/dev/null | grep -i location

echo "Clearing nginx cache..."
rm -rf /var/cache/ea-nginx/proxy/ravenai/* 2>/dev/null && echo "Cache cleared" || echo "Need root"
