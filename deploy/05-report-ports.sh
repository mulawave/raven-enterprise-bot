#!/bin/bash
# deploy/05-report-ports.sh
# Run as ROOT — moves Raven apps off port 3000 to 4010/4011/4012
set -e

CPANEL_USER=ravenai
REPO=/home/${CPANEL_USER}/raven-enterprise-bot

echo "=== Step 1: Update PORT in .env files ==="

# Backend: replace or append PORT
sed -i '/^PORT=/d' "${REPO}/backend/.env"
echo "PORT=4010" >> "${REPO}/backend/.env"
echo "  backend PORT=4010"

# Dashboard: replace or append PORT
sed -i '/^PORT=/d' "${REPO}/dashboard/.env"
echo "PORT=4011" >> "${REPO}/dashboard/.env"
echo "  dashboard PORT=4011"

# Admin console: replace or append PORT
sed -i '/^PORT=/d' "${REPO}/admin-console/.env"
echo "PORT=4012" >> "${REPO}/admin-console/.env"
echo "  admin PORT=4012"

echo ""
echo "=== Step 2: Update ecosystem.config.js ==="
cat > "${REPO}/ecosystem.config.js" << 'ECOSYS'
module.exports = {
  apps: [
    {
      name: 'raven-api',
      script: 'dist/apps/api/src/main.js',
      cwd: '/home/ravenai/raven-enterprise-bot/backend',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: '4010' },
      out_file: '/home/ravenai/.pm2/logs/raven-api-out.log',
      error_file: '/home/ravenai/.pm2/logs/raven-api-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'raven-worker',
      script: 'dist/apps/worker/main.js',
      cwd: '/home/ravenai/raven-enterprise-bot/backend',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      out_file: '/home/ravenai/.pm2/logs/raven-worker-out.log',
      error_file: '/home/ravenai/.pm2/logs/raven-worker-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '256M',
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: 'raven-dashboard',
      script: 'server.js',
      cwd: '/home/ravenai/raven-enterprise-bot/dashboard/.next/standalone',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: '4011', HOSTNAME: '127.0.0.1' },
      out_file: '/home/ravenai/.pm2/logs/raven-dashboard-out.log',
      error_file: '/home/ravenai/.pm2/logs/raven-dashboard-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '256M',
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'raven-admin',
      script: 'server.js',
      cwd: '/home/ravenai/raven-enterprise-bot/admin-console/.next/standalone',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: '4012', HOSTNAME: '127.0.0.1' },
      out_file: '/home/ravenai/.pm2/logs/raven-admin-out.log',
      error_file: '/home/ravenai/.pm2/logs/raven-admin-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '256M',
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
}
ECOSYS
echo "  ecosystem.config.js updated"

echo ""
echo "=== Step 3: Update Apache userdata proxy.conf files ==="

write_proxy() {
  local domain="$1"
  local port="$2"
  for dir in \
    "/etc/apache2/conf.d/userdata/std/2_4/${CPANEL_USER}/${domain}" \
    "/etc/apache2/conf.d/userdata/ssl/2_4/${CPANEL_USER}/${domain}" \
    "/etc/apache2/conf.d/userdata/ssl/2_4/${CPANEL_USER}/${domain}_SSL"; do
    if [ -d "${dir}" ]; then
      cat > "${dir}/proxy.conf" <<CONF
ProxyRequests Off
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:${port}/
ProxyPassReverse / http://127.0.0.1:${port}/
ProxyTimeout 120
CONF
      echo "  Updated: ${dir}/proxy.conf"
    fi
  done
}

write_proxy "api.raven-ai.online"   4010
write_proxy "app.raven-ai.online"   4011
write_proxy "admin.raven-ai.online" 4012

echo ""
echo "=== Step 4: Rebuild Apache and reload ==="
/usr/local/cpanel/scripts/rebuildhttpdconf 2>&1 | tail -2
httpd -t 2>&1 && systemctl reload httpd && echo "Apache reloaded OK"

echo ""
echo "=== Step 5: Restart PM2 apps ==="
su - ${CPANEL_USER} -c "
  pm2 delete all 2>/dev/null || true
  pm2 start ${REPO}/ecosystem.config.js
  pm2 save
  pm2 list
"

echo ""
echo "=== Step 6: Health check ==="
sleep 5
curl -so /dev/null -w "api (4010): %{http_code}\n"       https://api.raven-ai.online/health
curl -so /dev/null -w "dashboard (4011): %{http_code}\n" https://app.raven-ai.online
curl -so /dev/null -w "admin (4012): %{http_code}\n"     https://admin.raven-ai.online

echo "Done."
