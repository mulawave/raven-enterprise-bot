-- Subscription Tracking Test SQL
-- Run after Docker is started: psql -U app_user -d app_db -f test-subscription-flow.sql

-- 1. Create test subscription for test-tenant-1
INSERT INTO "Subscription" (
  id, tenant_id, plan_tier, status,
  current_period_start, current_period_end,
  conversations_used, conversations_limit,
  overage_cost_kobo,
  created_at, updated_at
) VALUES (
  'sub-test-1',
  'test-tenant-1',
  'starter',
  'active',
  NOW(),
  NOW() + INTERVAL '30 days',
  0,
  500,
  0,
  NOW(),
  NOW()
) ON CONFLICT (tenant_id) DO NOTHING;

-- 2. Verify subscription created
SELECT 
  id, tenant_id, plan_tier, status,
  conversations_used, conversations_limit,
  overage_cost_kobo,
  current_period_start, current_period_end
FROM "Subscription"
WHERE tenant_id = 'test-tenant-1';

-- 3. Simulate conversation increment (what AI processor does)
UPDATE "Subscription"
SET conversations_used = conversations_used + 1
WHERE tenant_id = 'test-tenant-1';

-- 4. Check updated count
SELECT conversations_used, conversations_limit
FROM "Subscription"
WHERE tenant_id = 'test-tenant-1';

-- 5. Simulate 450 more conversations (near 80% threshold)
UPDATE "Subscription"
SET conversations_used = 450
WHERE tenant_id = 'test-tenant-1';

-- 6. Check if warning threshold (80%) is crossed
SELECT 
  conversations_used,
  conversations_limit,
  ROUND((conversations_used::numeric / conversations_limit::numeric) * 100, 1) as usage_percent
FROM "Subscription"
WHERE tenant_id = 'test-tenant-1';

-- Expected: usage_percent = 90.0% (450/500)

-- 7. Simulate overage (550 conversations on 500 limit plan)
UPDATE "Subscription"
SET conversations_used = 550,
    overage_cost_kobo = (550 - 500) * 12000  -- 50 overage × ₦120 = ₦6,000
WHERE tenant_id = 'test-tenant-1';

-- 8. Calculate total bill
SELECT 
  plan_tier,
  conversations_used,
  conversations_limit,
  overage_cost_kobo,
  CASE plan_tier
    WHEN 'starter' THEN 4900000  -- ₦49,000 base
    WHEN 'growth' THEN 19900000  -- ₦199,000 base
    WHEN 'enterprise' THEN 79900000  -- ₦799,000 base
  END as base_cost_kobo,
  CASE plan_tier
    WHEN 'starter' THEN 4900000 + overage_cost_kobo
    WHEN 'growth' THEN 19900000 + overage_cost_kobo
    WHEN 'enterprise' THEN 79900000 + overage_cost_kobo
  END as total_cost_kobo
FROM "Subscription"
WHERE tenant_id = 'test-tenant-1';

-- Expected:
-- base_cost_kobo = 4900000 (₦49,000)
-- overage_cost_kobo = 600000 (₦6,000)
-- total_cost_kobo = 5500000 (₦55,000)

-- 9. Reset billing cycle (what monthly cron job does)
UPDATE "Subscription"
SET 
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '30 days',
  conversations_used = 0,
  overage_cost_kobo = 0
WHERE tenant_id = 'test-tenant-1';

-- 10. Verify reset
SELECT 
  conversations_used,
  overage_cost_kobo,
  current_period_start,
  current_period_end
FROM "Subscription"
WHERE tenant_id = 'test-tenant-1';

-- Expected:
-- conversations_used = 0
-- overage_cost_kobo = 0
-- current_period_end = ~30 days from now
