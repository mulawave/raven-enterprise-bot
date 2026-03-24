#!/bin/bash
# deploy/03-start-apps.sh
# Run as ROOT on the server: bash deploy/03-start-apps.sh
set -e

CPANEL_USER=ravenai
NODE=/usr/bin/node
PM2_BIN=/home/${CPANEL_USER}/.local/bin/pm2
USERDATA=/var/cpanel/userdata/${CPANEL_USER}

echo "=== Step 1: Write Apache userdata ProxyPass customconf files ==="

write_customconf() {
  local domain="$1"
  local port="$2"
  for suffix in "" "_SSL"; do
    local file="${USERDATA}/${domain}${suffix}"
    local customconf="${USERDATA}/${domain}${suffix}_customconf"
    # Only write if the base domain userdata file exists
    if [ -f "$file" ]; then
      cat > "${customconf}" <<EOF
ProxyRequests Off
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:${port}/
ProxyPassReverse / http://127.0.0.1:${port}/
ProxyTimeout 120
EOF
      echo "  Written: ${customconf}"
    else
      echo "  SKIP (domain file not found): ${file}"
    fi
  done
}

write_customconf "api.raven-ai.online"   4010
write_customconf "app.raven-ai.online"   4011
write_customconf "admin.raven-ai.online" 4012

echo ""
echo "=== Step 2: Rebuild Apache httpd.conf ==="
/usr/local/cpanel/scripts/rebuildhttpdconf 2>&1 | tail -3
systemctl reload httpd && echo "Apache reloaded OK"

echo ""
echo "=== Step 3: Verify PM2 installed for ${CPANEL_USER} ==="
if [ ! -f "${PM2_BIN}" ]; then
  echo "  Installing PM2 locally for ${CPANEL_USER}..."
  su - ${CPANEL_USER} -c "npm install pm2 --prefix ~/.local --silent"
fi
ls -la "${PM2_BIN}" && echo "PM2 binary confirmed"

echo ""
echo "=== Step 4: Append PORT to dashboard & admin .env if missing ==="
ENV_DASH="/home/${CPANEL_USER}/raven-enterprise-bot/dashboard/.env"
ENV_ADMIN="/home/${CPANEL_USER}/raven-enterprise-bot/admin-console/.env"

grep -q '^PORT=' "${ENV_DASH}" || { echo "PORT=4011" >> "${ENV_DASH}"; echo "  Added PORT=4011 to dashboard .env"; }
grep -q '^PORT=' "${ENV_ADMIN}" || { echo "PORT=4012" >> "${ENV_ADMIN}"; echo "  Added PORT=4012 to admin .env"; }

echo ""
echo "=== Step 5: Start all apps via PM2 ==="
su - ${CPANEL_USER} -c "
  export PATH=\$HOME/.local/bin:\$PATH
  cd ~/raven-enterprise-bot
  pm2 delete all 2>/dev/null || true
  pm2 start deploy/ecosystem.config.js
  pm2 save
  pm2 list
"

echo ""
echo "=== Step 6: Set up PM2 auto-start on reboot (crontab @reboot) ==="
CRON_LINE="@reboot sleep 15 && /home/${CPANEL_USER}/.local/bin/pm2 resurrect --update-env >> /home/${CPANEL_USER}/.pm2/logs/resurrect.log 2>&1"
# Add to ravenai's crontab if not already there
su - ${CPANEL_USER} -c "
  crontab -l 2>/dev/null | grep -q 'pm2 resurrect' || {
    (crontab -l 2>/dev/null; echo \"${CRON_LINE}\") | crontab -
    echo '  @reboot PM2 resurrect added to crontab'
  }
  echo 'Crontab:'
  crontab -l
"

echo ""
echo "=== DONE — waiting 5s for processes to stabilise ==="
sleep 5

echo ""
echo "=== Step 7: Health check (internal) ==="
curl -sf http://127.0.0.1:4010/health && echo " API /health OK" || echo " API /health FAILED"
curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:4011/ && echo " Dashboard OK" || echo " Dashboard FAILED"
curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:4012/ && echo " Admin OK" || echo " Admin FAILED"

echo ""
echo "All done."
