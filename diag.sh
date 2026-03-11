#!/bin/bash
echo "=== BUILD_ID ==="
cat ~/raven-enterprise-bot/admin-console/.next/BUILD_ID 2>/dev/null || echo MISSING

echo "=== STANDALONE BUILD_ID ==="
cat ~/raven-enterprise-bot/admin-console/.next/standalone/.next/BUILD_ID 2>/dev/null || echo MISSING

echo "=== LOGIN HTML MAIN ==="
ls ~/raven-enterprise-bot/admin-console/.next/server/app/admin/login.html 2>/dev/null || echo missing

echo "=== LOGIN HTML STANDALONE ==="
ls ~/raven-enterprise-bot/admin-console/.next/standalone/.next/server/app/admin/login.html 2>/dev/null || echo missing

echo "=== STATIC CHUNKS ==="
ls ~/raven-enterprise-bot/admin-console/.next/static/chunks/app/admin/login/ 2>/dev/null || echo MISSING

echo "=== STANDALONE STATIC CHUNKS ==="
ls ~/raven-enterprise-bot/admin-console/.next/standalone/.next/static/chunks/app/admin/login/ 2>/dev/null || echo MISSING

echo "=== LOCALHOST RESPONSE BUILD ID ==="
curl -s --max-time 10 http://127.0.0.1:4012/admin/login 2>/dev/null | grep -o '"buildId":"[^"]*"' | head -1 || echo CURL_FAILED

echo "=== LOCALHOST CHUNK STATUS ==="
curl -s -I --max-time 5 http://127.0.0.1:4012/_next/static/chunks/app/admin/login/page-8c25cdde7d91a6aa.js 2>/dev/null | head -3 || echo CURL_FAILED

echo "=== PASSENGER RUNNING? ==="
ps aux | grep -E 'PassengerAgent|node.*server' | grep -v grep | head -5

echo "=== NGINX CACHE CONFIG ==="
grep -r "proxy_cache\|fastcgi_cache" /etc/nginx/conf.d/ /etc/nginx/sites-enabled/ /etc/nginx/vhosts/ 2>/dev/null | head -20 || echo NO_CACHE_CONFIG

echo "=== SERVER LOG TAIL ==="
tail -20 ~/raven-enterprise-bot/admin-console/backend.err 2>/dev/null || \
tail -20 ~/logs/admin-console.err 2>/dev/null || echo NO_LOG_FOUND
