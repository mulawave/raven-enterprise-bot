-- Test Multi-Tenant Branding Isolation
-- Run after Docker is started: psql -U app_user -d app_db -f test-white-label.sql

-- 1. Create two test tenants with different branding
INSERT INTO "Tenant" (id, name, logo_url, theme, created_at, updated_at) VALUES 
  (
    'tenant-mama-cass',
    'Mama Cass Kitchen',
    'https://cdn.example.com/logos/mama-cass.png',
    '{"primary": "#FF5733", "secondary": "#C70039", "font": "Inter"}',
    NOW(),
    NOW()
  ),
  (
    'tenant-golden-palace',
    'Golden Palace Hotel',
    'https://cdn.example.com/logos/golden-palace.png',
    '{"primary": "#FFD700", "secondary": "#B8860B", "font": "Playfair Display"}',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url,
  theme = EXCLUDED.theme;

-- 2. Create branches for each tenant
INSERT INTO "Branch" (id, tenant_id, name, created_at, updated_at) VALUES
  ('branch-mama-cass-1', 'tenant-mama-cass', 'Victoria Island Branch', NOW(), NOW()),
  ('branch-golden-palace-1', 'tenant-golden-palace', 'Ikoyi Branch', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Create customers scoped to each tenant
INSERT INTO "Customer" (id, tenant_id, name, phone, email, created_at, updated_at) VALUES
  ('customer-mc-1', 'tenant-mama-cass', 'Chioma Adeyemi', '+2348012345678', 'chioma@example.com', NOW(), NOW()),
  ('customer-gp-1', 'tenant-golden-palace', 'Tunde Okafor', '+2348087654321', 'tunde@example.com', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Verify branding separation
SELECT 
  id,
  name,
  logo_url,
  LEFT(theme::text, 50) as theme_preview
FROM "Tenant"
WHERE id IN ('tenant-mama-cass', 'tenant-golden-palace');

-- Expected output:
-- tenant-mama-cass   | Mama Cass Kitchen       | https://cdn.../mama-cass.png  | {"primary": "#FF5733", ...
-- tenant-golden-palace | Golden Palace Hotel   | https://cdn.../golden-palace.png | {"primary": "#FFD700", ...

-- 5. Test cross-tenant data isolation (should return 0)
SELECT COUNT(*) as cross_tenant_customers
FROM "Customer"
WHERE tenant_id = 'tenant-mama-cass'
  AND id IN (SELECT id FROM "Customer" WHERE tenant_id = 'tenant-golden-palace');

-- Expected: 0 (customers are isolated)

-- 6. Simulate AI message with branding
-- (In practice, AI worker fetches branding automatically)
-- Manual verification:
SELECT 
  CONCAT('Welcome to ', name, '! How can I help you today?') as ai_greeting
FROM "Tenant"
WHERE id = 'tenant-mama-cass';

-- Expected: "Welcome to Mama Cass Kitchen! How can I help you today?"

SELECT 
  CONCAT('Welcome to ', name, '! How can I help you today?') as ai_greeting
FROM "Tenant"
WHERE id = 'tenant-golden-palace';

-- Expected: "Welcome to Golden Palace Hotel! How can I help you today?"

-- 7. Create menu items for Mama Cass
INSERT INTO "MenuCategory" (id, tenant_id, name, created_at) VALUES
  ('cat-mc-1', 'tenant-mama-cass', 'Nigerian Dishes', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "MenuItem" (id, tenant_id, category_id, name, price_kobo, available, created_at, updated_at) VALUES
  ('item-mc-1', 'tenant-mama-cass', 'cat-mc-1', 'Egusi Soup & Pounded Yam', 350000, true, NOW(), NOW()),
  ('item-mc-2', 'tenant-mama-cass', 'cat-mc-1', 'Jollof Rice & Chicken', 250000, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 8. Create room types for Golden Palace
INSERT INTO "RoomType" (id, tenant_id, name, price_kobo, created_at, updated_at) VALUES
  ('room-gp-1', 'tenant-golden-palace', 'Executive Suite', 5000000, NOW(), NOW()),
  ('room-gp-2', 'tenant-golden-palace', 'Presidential Villa', 15000000, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 9. Verify data isolation (Mama Cass should NOT see Golden Palace data)
SELECT 'Mama Cass Menu Items' as section, COUNT(*) as count
FROM "MenuItem"
WHERE tenant_id = 'tenant-mama-cass'
UNION ALL
SELECT 'Mama Cass Room Types' as section, COUNT(*) as count
FROM "RoomType"
WHERE tenant_id = 'tenant-mama-cass';

-- Expected:
-- Mama Cass Menu Items | 2
-- Mama Cass Room Types | 0

SELECT 'Golden Palace Menu Items' as section, COUNT(*) as count
FROM "MenuItem"
WHERE tenant_id = 'tenant-golden-palace'
UNION ALL
SELECT 'Golden Palace Room Types' as section, COUNT(*) as count
FROM "RoomType"
WHERE tenant_id = 'tenant-golden-palace';

-- Expected:
-- Golden Palace Menu Items | 0
-- Golden Palace Room Types | 2

-- 10. Create subscriptions for both tenants
INSERT INTO "Subscription" (
  id, tenant_id, plan_tier, status,
  current_period_start, current_period_end,
  conversations_used, conversations_limit,
  overage_cost_kobo, created_at, updated_at
) VALUES
  (
    'sub-mama-cass',
    'tenant-mama-cass',
    'starter',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    0,
    500,
    0,
    NOW(),
    NOW()
  ),
  (
    'sub-golden-palace',
    'tenant-golden-palace',
    'growth',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    0,
    2500,
    0,
    NOW(),
    NOW()
  )
ON CONFLICT (tenant_id) DO UPDATE SET
  plan_tier = EXCLUDED.plan_tier,
  conversations_limit = EXCLUDED.conversations_limit;

-- 11. Verify subscriptions
SELECT 
  t.name as business_name,
  s.plan_tier,
  s.conversations_used,
  s.conversations_limit
FROM "Subscription" s
JOIN "Tenant" t ON s.tenant_id = t.id
WHERE t.id IN ('tenant-mama-cass', 'tenant-golden-palace');

-- Expected:
-- Mama Cass Kitchen  | starter | 0 | 500
-- Golden Palace Hotel | growth  | 0 | 2500

-- 12. Test API response format (simulated)
-- GET /api/tenant/branding?tenantId=tenant-mama-cass
SELECT 
  json_build_object(
    'name', name,
    'logoUrl', logo_url,
    'theme', theme
  ) as api_response
FROM "Tenant"
WHERE id = 'tenant-mama-cass';

-- Expected JSON:
-- {
--   "name": "Mama Cass Kitchen",
--   "logoUrl": "https://cdn.example.com/logos/mama-cass.png",
--   "theme": "{\"primary\": \"#FF5733\", \"secondary\": \"#C70039\", \"font\": \"Inter\"}"
-- }
