-- Migration: 20260314000001_add_recaptcha_config_key
-- Adds RECAPTCHA_SITE_KEY to SystemConfig (security group)
-- This is the Google reCAPTCHA v2 site key shown on the register and onboarding pages.
-- It is NOT a secret — safe to expose to the browser.

INSERT INTO "SystemConfig" ("id", "key", "value", "description", "group", "is_secret", "updated_at")
VALUES
  (gen_random_uuid(), 'RECAPTCHA_SITE_KEY', NULL, 'Google reCAPTCHA v2 site key — displayed on the Register and Onboarding forms. Register at google.com/recaptcha/admin (v2 I''m not a robot). Not a secret — safe to expose in the browser.', 'security', false, NOW())
ON CONFLICT ("key") DO NOTHING;
