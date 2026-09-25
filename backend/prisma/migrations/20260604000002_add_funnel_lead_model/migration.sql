-- Create FunnelLead table for public funnel lead submissions
CREATE TABLE "FunnelLead" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "source" TEXT,
  "answers" TEXT NOT NULL,
  "recommendation" TEXT,
  "recommendation_metadata" TEXT,
  "intent_score" INTEGER,
  "intent_label" TEXT,
  "is_high_intent" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE INDEX "FunnelLead_created_at_idx" ON "FunnelLead"("created_at");
CREATE INDEX "FunnelLead_intent_score_idx" ON "FunnelLead"("intent_score");
