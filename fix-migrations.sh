#!/bin/bash
set -e

M0="/home/ravenai/raven-enterprise-bot/backend/prisma/migrations/20260305000000_add_system_config/migration.sql"
M1="/home/ravenai/raven-enterprise-bot/backend/prisma/migrations/20260305000001_add_plan_table/migration.sql"
M2="/home/ravenai/raven-enterprise-bot/backend/prisma/migrations/20260305000002_add_extra_config_keys/migration.sql"

PREFIX="CREATE EXTENSION IF NOT EXISTS pgcrypto;\n\n"

for FILE in "$M0" "$M1" "$M2"; do
  if ! grep -q "pgcrypto" "$FILE"; then
    printf '%s' "$(printf "$PREFIX")$(cat "$FILE")" > "$FILE"
    echo "Patched: $FILE"
  else
    echo "Already patched: $FILE"
  fi
done

echo "ALL_FILES_PATCHED"
