#!/bin/bash
# deploy/04-apache-proxy.sh
# Run as ROOT — creates Apache proxy conf for all 3 subdomains (isolated to ravenai account)
set -e

CPANEL_USER=ravenai

echo "=== Writing Apache include conf files for each subdomain ==="

write_proxy_conf() {
  local domain="$1"
  local port="$2"

  # Standard (HTTP) VirtualHost include dir
  local std_dir="/etc/apache2/conf.d/userdata/std/2_4/${CPANEL_USER}/${domain}"
  mkdir -p "${std_dir}"
  cat > "${std_dir}/proxy.conf" <<CONF
ProxyRequests Off
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:${port}/
ProxyPassReverse / http://127.0.0.1:${port}/
ProxyTimeout 120
CONF
  echo "  Written: ${std_dir}/proxy.conf"

  # SSL VirtualHost include dir  (cPanel uses domain_SSL suffix for the SSL vhost)
  # Try both naming conventions
  for ssl_domain in "${domain}" "${domain}_SSL"; do
    local ssl_dir="/etc/apache2/conf.d/userdata/ssl/2_4/${CPANEL_USER}/${ssl_domain}"
    mkdir -p "${ssl_dir}"
    cat > "${ssl_dir}/proxy.conf" <<CONF
ProxyRequests Off
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:${port}/
ProxyPassReverse / http://127.0.0.1:${port}/
ProxyTimeout 120
CONF
    echo "  Written: ${ssl_dir}/proxy.conf"
  done
}

write_proxy_conf "api.raven-ai.online"   4010
write_proxy_conf "app.raven-ai.online"   4011
write_proxy_conf "admin.raven-ai.online" 4012

echo ""
echo "=== Rebuilding Apache httpd.conf ==="
/usr/local/cpanel/scripts/rebuildhttpdconf 2>&1 | tail -3

echo ""
echo "=== Checking if Includes are now active ==="
HAS_PROXY=$(grep -c 'ProxyPass' /etc/apache2/conf/httpd.conf 2>/dev/null || echo 0)
echo "ProxyPass lines in httpd.conf: ${HAS_PROXY}"

if [ "${HAS_PROXY}" = "0" ]; then
  echo ""
  echo "=== Includes still commented — patching httpd.conf directly ==="
  # cPanel puts a commented Include in each VirtualHost that references the userdata dir
  # Un-comment all Include lines that reference our user's domain include dirs
  sed -i "s|^  # Include \"/etc/apache2/conf.d/userdata/|  Include \"/etc/apache2/conf.d/userdata/|g" \
    /etc/apache2/conf/httpd.conf
  PATCHED=$(grep -c 'Include.*conf.d/userdata' /etc/apache2/conf/httpd.conf || echo 0)
  echo "Active Include lines after patch: ${PATCHED}"
fi

echo ""
echo "=== Reloading Apache ==="
httpd -t 2>&1 && systemctl reload httpd && echo "Apache reloaded OK"

echo ""
echo "=== Final verification — ProxyPass in httpd.conf ==="
grep 'ProxyPass' /etc/apache2/conf/httpd.conf || echo "(not found in main conf, checking includes)"
grep -r 'ProxyPass' /etc/apache2/conf.d/userdata/ 2>/dev/null | head -10

echo ""
echo "=== External test ==="
sleep 2
curl -so /dev/null -w "api: %{http_code}\n" https://api.raven-ai.online/health
curl -so /dev/null -w "dashboard: %{http_code}\n" https://app.raven-ai.online
curl -so /dev/null -w "admin: %{http_code}\n" https://admin.raven-ai.online

echo "Done."
