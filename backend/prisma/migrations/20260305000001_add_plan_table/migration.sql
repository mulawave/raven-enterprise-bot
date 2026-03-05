CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_kobo" INTEGER NOT NULL,
    "conversations_limit" INTEGER NOT NULL,
    "overage_price_kobo" INTEGER NOT NULL,
    "features" TEXT NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_tier_key" ON "Plan"("tier");

-- CreateIndex
CREATE INDEX "Plan_is_active_idx" ON "Plan"("is_active");

-- Seed default plans (mirroring the hardcoded PLANS constant)
INSERT INTO "Plan" ("id", "tier", "name", "description", "price_kobo", "conversations_limit", "overage_price_kobo", "features", "is_active", "sort_order", "updated_at") VALUES
  (
    gen_random_uuid(),
    'starter',
    'Starter Plan',
    'Perfect for small businesses getting started with WhatsApp automation.',
    4900000,
    500,
    12000,
    '["500 conversations/month","WhatsApp & Instagram","AI-powered responses","Basic analytics","Email support"]',
    true,
    1,
    NOW()
  ),
  (
    gen_random_uuid(),
    'growth',
    'Growth Plan',
    'Ideal for growing businesses with higher messaging volume.',
    19900000,
    2500,
    10000,
    '["2,500 conversations/month","All channels supported","Advanced AI responses","Full analytics","Priority support","Custom branding"]',
    true,
    2,
    NOW()
  ),
  (
    gen_random_uuid(),
    'enterprise',
    'Enterprise Plan',
    'For large businesses that need unlimited scale and dedicated support.',
    79900000,
    12000,
    8000,
    '["12,000 conversations/month","All channels supported","Custom AI training","Advanced analytics & exports","Dedicated account manager","SLA guarantee","Custom integrations"]',
    true,
    3,
    NOW()
  );
