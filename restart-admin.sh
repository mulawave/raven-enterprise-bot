#!/bin/bash
PID=$(ss -tlnp 2>/dev/null | grep ':4012' | grep -oP 'pid=\K[0-9]+' | head -1)
if [ -n "$PID" ]; then
  kill -9 "$PID" && echo "Killed PID $PID" || echo "Could not kill $PID"
else
  echo "No process found on port 4012"
fi
sleep 3
touch ~/raven-enterprise-bot/admin-console/tmp/restart.txt
echo "restart.txt touched"

echo "Waiting 20s for Passenger restart..."
sleep 20

NEW_PID=$(ss -tlnp 2>/dev/null | grep ':4012' | grep -oP 'pid=\K[0-9]+' | head -1)
echo "New PID on 4012: $NEW_PID"

BUILD_ID=$(curl -s --max-time 15 http://127.0.0.1:4012/admin/ 2>/dev/null | grep -o 'buildId..................................................' | head -1)
echo "Live build from /admin/: $BUILD_ID"

echo "Clearing nginx cache..."
rm -rf /var/cache/ea-nginx/proxy/ravenai/* 2>/dev/null && echo "Cache cleared" || echo "Need root for cache"
