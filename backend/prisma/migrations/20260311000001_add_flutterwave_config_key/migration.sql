-- Migration: 20260311000001_add_flutterwave_config_key
-- Adds FLUTTERWAVE_SECRET_KEY to SystemConfig (payment group)

INSERT INTO "SystemConfig" ("id", "key", "value", "description", "group", "is_secret", "updated_at")
VALUES
  (gen_random_uuid(), 'FLUTTERWAVE_SECRET_KEY', NULL, 'Flutterwave secret key (FLWSECK_...) — used for payouts and bank transfers', 'payment', true, NOW())
ON CONFLICT ("key") DO NOTHING;
