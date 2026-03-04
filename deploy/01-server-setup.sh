#!/usr/bin/env bash
# =============================================================================
# Raven Enterprise — ONE-TIME SERVER SETUP
# Run this as root via: WHM → Terminal (or SSH as root)
#
# AlmaLinux 8 / 9  |  Tested on AlmaLinux 8.9
# =============================================================================
set -euo pipefail

RAVEN_DB_USER="ravenuser"
RAVEN_DB_PASS="$(openssl rand -hex 24)"
RAVEN_DB_NAME="ravendb"
CPANEL_USER="${1:-}"   # pass the cPanel account username as first arg

echo "============================================"
echo " Raven Enterprise — Server Setup"
echo "============================================"

if [[ -z "$CPANEL_USER" ]]; then
  echo "ERROR: Pass the cPanel username as the first argument."
  echo "Usage: bash 01-server-setup.sh myusername"
  exit 1
fi

# ── PostgreSQL 16 ─────────────────────────────────────────────────────────────
echo ">>> Installing PostgreSQL 16..."
if ! rpm -q postgresql16-server &>/dev/null; then
  # AlmaLinux 8
  if grep -q "AlmaLinux release 8" /etc/almalinux-release 2>/dev/null; then
    dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm
  else
    # AlmaLinux 9
    dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm
  fi
  dnf -qy module disable postgresql 2>/dev/null || true
  dnf install -y postgresql16-server postgresql16
  /usr/pgsql-16/bin/postgresql-16-setup initdb
  systemctl enable --now postgresql-16
  echo "PostgreSQL 16 installed and started."
else
  echo "PostgreSQL 16 already installed."
fi

# ── Allow password auth in pg_hba.conf ────────────────────────────────────────
PG_HBA="/var/lib/pgsql/16/data/pg_hba.conf"
if grep -q "ident" "$PG_HBA"; then
  sed -i 's/^\(local.*all.*all.*\)ident/\1scram-sha-256/' "$PG_HBA"
  sed -i 's/^\(host.*all.*all.*127.*\)ident/\1scram-sha-256/' "$PG_HBA"
  systemctl reload postgresql-16
  echo "pg_hba.conf updated to scram-sha-256."
fi

# ── Create database + user ─────────────────────────────────────────────────────
echo ">>> Creating database '$RAVEN_DB_NAME' and user '$RAVEN_DB_USER'..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${RAVEN_DB_USER}') THEN
    CREATE ROLE ${RAVEN_DB_USER} WITH LOGIN PASSWORD '${RAVEN_DB_PASS}';
  END IF;
END
\$\$;
CREATE DATABASE ${RAVEN_DB_NAME} OWNER ${RAVEN_DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${RAVEN_DB_NAME} TO ${RAVEN_DB_USER};
SQL
echo "Database created."

# ── Redis ────────────────────────────────────────────────────────────────────
echo ">>> Installing Redis..."
if ! rpm -q redis &>/dev/null; then
  dnf install -y redis
fi
# Bind only to localhost for security
sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf
# Enable AOF persistence
sed -i 's/^appendonly no/appendonly yes/' /etc/redis/redis.conf
systemctl enable --now redis
echo "Redis installed and running (localhost only, AOF persistence on)."

# ── Firewall — block Postgres + Redis from outside ───────────────────────────
if command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-service=http
  firewall-cmd --permanent --add-service=https
  # Postgres + Redis are NOT opened externally
  firewall-cmd --reload
  echo "Firewall updated."
fi

# ── Add SSH public key for GitHub Actions deploy ─────────────────────────────
DEPLOY_KEY_DIR="/home/${CPANEL_USER}/.ssh"
mkdir -p "$DEPLOY_KEY_DIR"
chmod 700 "$DEPLOY_KEY_DIR"
touch "$DEPLOY_KEY_DIR/authorized_keys"
chmod 600 "$DEPLOY_KEY_DIR/authorized_keys"
chown -R "${CPANEL_USER}:${CPANEL_USER}" "$DEPLOY_KEY_DIR"
echo ""
echo ">>> IMPORTANT: Paste your GitHub Actions deploy public key into:"
echo "    /home/${CPANEL_USER}/.ssh/authorized_keys"
echo ""

# ── Create Passenger restart dirs ────────────────────────────────────────────
for APP in backend dashboard admin-console; do
  APPDIR="/home/${CPANEL_USER}/raven-enterprise-bot/${APP}/tmp"
  mkdir -p "$APPDIR"
  chown -R "${CPANEL_USER}:${CPANEL_USER}" "$APPDIR"
done

# ── Print connection strings ──────────────────────────────────────────────────
echo ""
echo "============================================"
echo " SAVE THESE CREDENTIALS — shown only once"
echo "============================================"
echo " DATABASE_URL=postgresql://${RAVEN_DB_USER}:${RAVEN_DB_PASS}@127.0.0.1:5432/${RAVEN_DB_NAME}"
echo " REDIS_URL=redis://127.0.0.1:6379"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Save the DATABASE_URL above into ~/raven-enterprise-bot/backend/.env"
echo "  2. Run deploy/02-first-deploy.sh ${CPANEL_USER} to clone and build the app"
echo "  3. Configure 3 Node.js apps in cPanel — see deploy/cpanel-setup.md"
