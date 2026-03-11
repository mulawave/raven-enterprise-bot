CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Migration: 20260311000002_add_flutterwave_full_keys
-- Adds Flutterwave public key, webhook secret, and merchant ID
-- Also updates secret key description to reflect full usage (payments, plans, payouts)

UPDATE "SystemConfig"
SET "description" = 'Flutterwave secret key (FLWSECK_...) — used for payments, subscription plans, and bank payouts'
WHERE "key" = 'FLUTTERWAVE_SECRET_KEY';

INSERT INTO "SystemConfig" ("id", "key", "value", "description", "group", "is_secret", "updated_at")
VALUES
  (gen_random_uuid(), 'FLUTTERWAVE_PUBLIC_KEY',     NULL, 'Flutterwave public key (FLWPUBK_...) — used for payment form initialization', 'payment', false, NOW()),
  (gen_random_uuid(), 'FLUTTERWAVE_WEBHOOK_SECRET', NULL, 'Flutterwave webhook secret — used to verify incoming webhook event signatures', 'payment', true,  NOW()),
  (gen_random_uuid(), 'FLUTTERWAVE_MERCHANT_ID',    NULL, 'Flutterwave Merchant ID from your Flutterwave dashboard account settings', 'payment', false, NOW())
ON CONFLICT ("key") DO NOTHING;
