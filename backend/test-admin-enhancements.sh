#!/bin/bash

# Test script for admin console enhancements

echo "🧪 Testing Admin Console Enhancements"
echo "======================================"
echo ""

# Get auth token
echo "📝 Step 1: Login and get auth token"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@raven.ai","password":"SuperAdmin123!"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful. Token: ${TOKEN:0:20}..."
echo ""

# Test Settings Endpoints
echo "📝 Step 2: Test Settings GET endpoint"
SETTINGS_GET=$(curl -s http://localhost:4000/admin/settings \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $SETTINGS_GET"
echo ""

echo "📝 Step 3: Test Settings PATCH endpoint"
SETTINGS_UPDATE=$(curl -s -X PATCH http://localhost:4000/admin/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Raven Enterprise","company_email":"info@raven.enterprise","company_phone":"+1-555-0100"}')

echo "Response: $SETTINGS_UPDATE"
echo ""

# Test Profile Endpoints
echo "📝 Step 4: Test Profile GET endpoint"
PROFILE_GET=$(curl -s http://localhost:4000/admin/profile \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $PROFILE_GET"
echo ""

echo "📝 Step 5: Test Profile PATCH endpoint"
PROFILE_UPDATE=$(curl -s -X PATCH http://localhost:4000/admin/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Super Admin","email":"admin@raven.enterprise"}')

echo "Response: $PROFILE_UPDATE"
echo ""

# Test File Upload Endpoints
echo "📝 Step 6: Test Logo Upload (requires test image)"
echo "Skipping file upload test - requires actual image file"
echo ""

echo "📝 Step 7: Test Favicon Upload (requires test image)"
echo "Skipping file upload test - requires actual image file"
echo ""

echo "📝 Step 8: Test Avatar Upload (requires test image)"
echo "Skipping file upload test - requires actual image file"
echo ""

# Check upload directories
echo "📝 Step 9: Check upload directories exist"
if [ -d "./uploads/settings" ]; then
  echo "✅ uploads/settings directory exists"
else
  echo "❌ uploads/settings directory not found"
fi

if [ -d "./uploads/avatars" ]; then
  echo "✅ uploads/avatars directory exists"
else
  echo "❌ uploads/avatars directory not found"
fi
echo ""

echo "======================================"
echo "✅ Basic API tests completed!"
echo "======================================"
