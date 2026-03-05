-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "group" TEXT NOT NULL DEFAULT 'general',
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "SystemConfig_group_idx" ON "SystemConfig"("group");

-- Seed default config keys (values left NULL — admin must fill them in)
INSERT INTO "SystemConfig" ("id", "key", "value", "description", "group", "is_secret", "updated_at") VALUES
  (gen_random_uuid(), 'META_APP_SECRET',           NULL, 'Meta App Secret from the Meta Developer Portal', 'whatsapp', true,  NOW()),
  (gen_random_uuid(), 'META_WEBHOOK_VERIFY_TOKEN', NULL, 'Self-chosen token used to verify Meta webhook deliveries', 'whatsapp', true, NOW()),
  (gen_random_uuid(), 'META_ACCESS_TOKEN',          NULL, 'Permanent access token for the Meta Business Account', 'whatsapp', true, NOW()),
  (gen_random_uuid(), 'META_PHONE_NUMBER_ID',       NULL, 'Phone Number ID from the Meta Business Account WhatsApp setup', 'whatsapp', false, NOW()),
  (gen_random_uuid(), 'PAYSTACK_SECRET_KEY',        NULL, 'Paystack secret key (sk_test_... or sk_live_...)', 'payment', true, NOW()),
  (gen_random_uuid(), 'PAYSTACK_PUBLIC_KEY',        NULL, 'Paystack public key (pk_test_... or pk_live_...)', 'payment', false, NOW()),
  (gen_random_uuid(), 'PAYMENT_CALLBACK_URL',       NULL, 'URL Paystack redirects to after payment', 'payment', false, NOW()),
  (gen_random_uuid(), 'OPENAI_API_KEY',             NULL, 'OpenAI API key for AI assistant features', 'ai', true, NOW()),
  (gen_random_uuid(), 'SMTP_HOST',                  NULL, 'SMTP server hostname (e.g. smtp.sendgrid.net)', 'email', false, NOW()),
  (gen_random_uuid(), 'SMTP_PORT',                  '587', 'SMTP port (25, 465, 587)', 'email', false, NOW()),
  (gen_random_uuid(), 'SMTP_USER',                  NULL, 'SMTP username / login', 'email', false, NOW()),
  (gen_random_uuid(), 'SMTP_PASS',                  NULL, 'SMTP password', 'email', true, NOW()),
  (gen_random_uuid(), 'SMTP_FROM',                  NULL, 'From address used in all outgoing emails', 'email', false, NOW()),
  (gen_random_uuid(), 'SMTP_SECURE',                'false', 'Use TLS for SMTP (true = port 465)', 'email', false, NOW()),
  (gen_random_uuid(), 'SMTP_PROVIDER',              'smtp', 'Email provider: smtp | php_mail | internal', 'email', false, NOW());
