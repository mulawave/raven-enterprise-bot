#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_PATH="${1:-${ROOT_DIR}/raven-deploy.tar.gz}"

mkdir -p "$(dirname "${OUTPUT_PATH}")"
rm -f "$OUTPUT_PATH"

cd "$ROOT_DIR"

tar -czf "$OUTPUT_PATH" \
  --exclude=.git \
  --exclude=.next \
  --exclude=.turbo \
  --exclude=coverage \
  --exclude=node_modules \
  --exclude=backend/node_modules \
  --exclude=dashboard/node_modules \
  --exclude=admin-console/node_modules \
  --exclude=backend/dist \
  --exclude=backend/.env \
  --exclude=backend/.env.local \
  --exclude=dashboard/.env \
  --exclude=dashboard/.env.local \
  --exclude=admin-console/.env \
  --exclude=admin-console/.env.local \
  --exclude=backend/backend.err \
  --exclude=raven.bundle \
  .

echo "Created deployment archive at ${OUTPUT_PATH}"