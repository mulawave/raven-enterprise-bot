#!/bin/bash
# Full diagnostic - writes to a file

OUT="/tmp/raven_diag_$(date +%s).txt"

echo "=== NGINX RAVENAI SUBDOMAIN CONFIGS ===" >> $OUT
ls /etc/nginx/conf.d/users/ravenai/ 2>&1 >> $OUT

echo "" >> $OUT
echo "=== ADMIN SUBDOMAIN CONFIG ===" >> $OUT
ls /etc/nginx/conf.d/users/ravenai/raven-ai.online/ 2>&1 >> $OUT
cat /etc/nginx/conf.d/users/ravenai/raven-ai.online/*.conf 2>&1 | head -200 >> $OUT

echo "" >> $OUT
echo "=== PASSENGER PROCESSES ===" >> $OUT
ps aux | grep -E 'Passenger|passenger' | grep -v grep >> $OUT
echo "---" >> $OUT
ps aux | grep -E 'node.*server|server.*node' | grep -v grep | head -10 >> $OUT

echo "" >> $OUT
echo "=== NODE PROCESSES ===" >> $OUT
ps aux | grep node | grep -v grep | head -20 >> $OUT

echo "" >> $OUT
echo "=== PORT 4012 LISTENER ===" >> $OUT
ss -tlnp | grep 4012 2>&1 >> $OUT || netstat -tlnp 2>/dev/null | grep 4012 >> $OUT

echo "" >> $OUT
echo "=== LOCALHOST 4012 LOGIN RESPONSE ===" >> $OUT
curl -v --max-time 10 http://127.0.0.1:4012/admin/login 2>&1 | grep -E 'buildId|HTTP|error|Error' | head -10 >> $OUT

echo "" >> $OUT
echo "=== ADMIN CONSOLE SERVER LOG ===" >> $OUT
ls ~/logs/ 2>/dev/null >> $OUT
ls ~/raven-enterprise-bot/admin-console/logs/ 2>/dev/null >> $OUT
cat ~/raven-enterprise-bot/admin-console/backend.err 2>/dev/null | tail -30 >> $OUT || echo "no backend.err" >> $OUT

echo "" >> $OUT
echo "=== CPANEL NODE APP CONFIG ===" >> $OUT
cat ~/.cpanel/ea4/ea4.conf 2>/dev/null | head -30 >> $OUT
ls ~/.cpanel/ea4/ 2>/dev/null >> $OUT

echo "DONE: $OUT"
cat $OUT
