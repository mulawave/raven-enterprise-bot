# Test script for admin console enhancements

Write-Host "Testing Admin Console Enhancements" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Test if backend is running
Write-Host "Step 0: Check if backend is running on port 4000" -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "OK: Backend is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Backend is not running on port 4000" -ForegroundColor Red
    Write-Host "Please start the backend server first: cd backend; npm run start:dev" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Get auth token
Write-Host "Step 1: Login and get auth token" -ForegroundColor Yellow
$loginBody = @{
    email = "admin@raven.ai"
    password = "SuperAdmin123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/admin/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $loginResponse.access_token

    if ($null -eq $token) {
        Write-Host "❌ Login failed. No token received" -ForegroundColor Red
        exit 1
    }

    Write-Host "OK: Login successful. Token: $($token.Substring(0, 20))..." -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test Settings Endpoints
Write-Host "Step 2: Test Settings GET endpoint" -ForegroundColor Yellow
try {
    $settings = Invoke-RestMethod -Uri "http://localhost:4000/admin/settings" `
        -Method GET `
        -Headers @{ Authorization = "Bearer $token" }
    
    Write-Host "OK: Settings retrieved:" -ForegroundColor Green
    Write-Host ($settings | ConvertTo-Json)
} catch {
    Write-Host "❌ Failed to get settings: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "Step 3: Test Settings PATCH endpoint" -ForegroundColor Yellow
$settingsUpdate = @{
    company_name = "Raven Enterprise"
    company_email = "info@raven.enterprise"
    company_phone = "+1-555-0100"
    company_address = "123 Enterprise Blvd, Tech City, TC 12345"
} | ConvertTo-Json

try {
    $updatedSettings = Invoke-RestMethod -Uri "http://localhost:4000/admin/settings" `
        -Method PATCH `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $token" } `
        -Body $settingsUpdate
    
    Write-Host "OK: Settings updated:" -ForegroundColor Green
    Write-Host ($updatedSettings | ConvertTo-Json)
} catch {
    Write-Host "❌ Failed to update settings: $_" -ForegroundColor Red
}
Write-Host ""

# Test Profile Endpoints
Write-Host "Step 4: Test Profile GET endpoint" -ForegroundColor Yellow
try {
    $adminProfile = Invoke-RestMethod -Uri "http://localhost:4000/admin/profile" `
        -Method GET `
        -Headers @{ Authorization = "Bearer $token" }
    
    Write-Host "OK: Profile retrieved:" -ForegroundColor Green
    Write-Host ($adminProfile | ConvertTo-Json)
} catch {
    Write-Host "❌ Failed to get profile: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "Step 5: Test Profile PATCH endpoint" -ForegroundColor Yellow
$profileUpdate = @{
    name = "Super Admin"
} | ConvertTo-Json

try {
    $updatedProfile = Invoke-RestMethod -Uri "http://localhost:4000/admin/profile" `
        -Method PATCH `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $token" } `
        -Body $profileUpdate
    
    Write-Host "OK: Profile updated:" -ForegroundColor Green
    Write-Host ($updatedProfile | ConvertTo-Json)
} catch {
    Write-Host "❌ Failed to update profile: $_" -ForegroundColor Red
}
Write-Host ""

# Check upload directories
Write-Host "Step 6: Check upload directories exist" -ForegroundColor Yellow
if (Test-Path ".\uploads\settings") {
    Write-Host "✅ uploads\settings directory exists" -ForegroundColor Green
} else {
    Write-Host "❌ uploads\settings directory not found" -ForegroundColor Red
}

if (Test-Path ".\uploads\avatars") {
    Write-Host "✅ uploads\avatars directory exists" -ForegroundColor Green
} else {
    Write-Host "❌ uploads\avatars directory not found" -ForegroundColor Red
}
Write-Host ""

# Check frontend
Write-Host "Step 7: Check if frontend is accessible" -ForegroundColor Yellow
try {
    $frontendCheck = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -ErrorAction Stop
    Write-Host "OK: Frontend is accessible at http://localhost:3001" -ForegroundColor Green
} catch {
    Write-Host "WARN: Frontend is not running on port 3001" -ForegroundColor Yellow
    Write-Host "Start it with: cd admin-console; npm run dev" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "API tests completed" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3001/admin in your browser" -ForegroundColor White
Write-Host "2. Login with: admin@raven.ai / SuperAdmin123!" -ForegroundColor White
Write-Host "3. Navigate to Settings page and test all features" -ForegroundColor White
Write-Host "4. Navigate to Profile page and test all features" -ForegroundColor White
Write-Host "5. Verify drag-drop uploads work with progress bars" -ForegroundColor White
Write-Host "6. Verify auto-save works on all text fields" -ForegroundColor White
