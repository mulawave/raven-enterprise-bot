#!/bin/bash
curl -s -X POST https://api.raven-ai.online/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@raven-ai.online","password":"RavenAI2025!"}' | python3 -m json.tool 2>/dev/null || echo "Raw response:" && \
curl -s -X POST https://api.raven-ai.online/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@raven-ai.online","password":"RavenAI2025!"}'
