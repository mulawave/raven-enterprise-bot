#!/usr/bin/env bash
# =============================================================================
# Raven Enterprise — ROOT SETUP (minimal — safe for shared hosting)
# Run as root in WHM Terminal or via SSH.
#
# ONLY does: creates PostgreSQL database + user for ravenai.
# Does NOT: upgrade/modify PG, touch other accounts, install system packages.
#
# Usage:
#   bash deploy/01-root-db-setup.sh
# =============================================================================
set -euo pipefail

RAVEN_DB_USER="ravenai_db"
RAVEN_DB_PASS="$(openssl rand -hex 24)"
RAVEN_DB_NAME="ravenai_prod"
RAVEN_UNIX_USER="ravenai"

echo "============================================"
echo " Raven — Root DB Setup (read-only for other accounts)"
echo "============================================"

# ── Verify Postgres is running ────────────────────────────────────────────────
if ! systemctl is-active --quiet postgresql; then
  echo "ERROR: PostgreSQL service is not running. Start it first."
  exit 1
fi

PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
echo "PostgreSQL $PG_VERSION detected and running."

# ── Create DB user + database ─────────────────────────────────────────────────
echo ">>> Creating database '$RAVEN_DB_NAME' and user '$RAVEN_DB_USER'..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${RAVEN_DB_USER}') THEN
    CREATE ROLE ${RAVEN_DB_USER} WITH LOGIN PASSWORD '${RAVEN_DB_PASS}';
    RAISE NOTICE 'User created: ${RAVEN_DB_USER}';
  ELSE
    ALTER ROLE ${RAVEN_DB_USER} WITH PASSWORD '${RAVEN_DB_PASS}';
    RAISE NOTICE 'User already exists — password updated: ${RAVEN_DB_USER}';
  END IF;
END
\$\$;

SELECT 'EXISTS' FROM pg_database WHERE datname = '${RAVEN_DB_NAME}' \gset
\if :{?EXISTS}
  \echo 'Database already exists: ${RAVEN_DB_NAME}'
\else
  CREATE DATABASE ${RAVEN_DB_NAME} OWNER ${RAVEN_DB_USER} ENCODING 'UTF8';
  \echo 'Database created: ${RAVEN_DB_NAME}'
\endif

GRANT ALL PRIVILEGES ON DATABASE ${RAVEN_DB_NAME} TO ${RAVEN_DB_USER};
SQL

echo ""
echo "============================================"
echo " SAVE THESE — shown only once"
echo "============================================"
echo " DATABASE_URL=postgresql://${RAVEN_DB_USER}:${RAVEN_DB_PASS}@127.0.0.1:5432/${RAVEN_DB_NAME}"
echo "============================================"
echo ""
echo "Next: SSH in as ravenai and run deploy/02-user-setup.sh"
echo "(paste the DATABASE_URL above into backend/.env when prompted)"
