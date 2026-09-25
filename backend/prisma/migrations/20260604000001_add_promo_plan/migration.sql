-- Add promo plan to Plan table
INSERT INTO "Plan" (id, tier, name, description, price_kobo, conversations_limit, overage_price_kobo, features, is_active, sort_order, created_at, updated_at)
VALUES (
  'plan_promo_' || substr(md5(random()::text), 1, 8),
  'promo',
  'Promo Plan',
  'Introductory plan with 7-day free trial',
  1900000,
  200,
  15000,
  '["200 conversations per month", "Basic analytics", "Email support"]',
  true,
  0,
  NOW(),
  NOW()
)
ON CONFLICT (tier) DO NOTHING;
