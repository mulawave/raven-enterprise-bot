-- Add trial fields to Subscription model
ALTER TABLE "Subscription" ADD COLUMN "trial_started_at" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "trial_converted_at" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "promo_offer_code" TEXT;

-- Create index for trial_ends_at for efficient filtering
CREATE INDEX "Subscription_trial_ends_at_idx" ON "Subscription"("trial_ends_at");
