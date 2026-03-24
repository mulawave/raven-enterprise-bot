-- CreateTable: TenantBotConfig (per-tenant LLM/bot personality settings)
CREATE TABLE "TenantBotConfig" (
    "id"                 TEXT NOT NULL,
    "tenant_id"          TEXT NOT NULL,
    "system_prompt"      TEXT,
    "personality_tone"   TEXT NOT NULL DEFAULT 'professional',
    "fallback_reply"     TEXT,
    "about_reply_text"   TEXT,
    "about_image_url"    TEXT,
    "about_cta_url"      TEXT,
    "about_cta_label"    TEXT NOT NULL DEFAULT 'Start for free',
    "escalation_message" TEXT NOT NULL DEFAULT 'I''ll have a team member reach you shortly.',
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantBotConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantBotConfig_tenant_id_key" ON "TenantBotConfig"("tenant_id");
CREATE INDEX "TenantBotConfig_tenant_id_idx" ON "TenantBotConfig"("tenant_id");

ALTER TABLE "TenantBotConfig"
    ADD CONSTRAINT "TenantBotConfig_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
