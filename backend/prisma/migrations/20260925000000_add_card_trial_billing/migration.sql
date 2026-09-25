-- Card-up-front 14-day trial and automatic renewal via saved Paystack authorization
ALTER TABLE "Subscription" ADD COLUMN "post_trial_plan_tier" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN "paystack_authorization_code" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "card_last4" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "card_brand" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "billing_email" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "last_charge_attempt_at" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "last_charge_error" TEXT;
