-- CreateTable: WebsiteAssistant
CREATE TABLE "WebsiteAssistant" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "public_embed_key" TEXT NOT NULL,
    "welcome_message" TEXT,
    "theme_color" TEXT,
    "text_color" TEXT,
    "avatar_url" TEXT,
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "show_branding" BOOLEAN NOT NULL DEFAULT true,
    "collect_name" BOOLEAN NOT NULL DEFAULT false,
    "collect_email" BOOLEAN NOT NULL DEFAULT false,
    "collect_phone" BOOLEAN NOT NULL DEFAULT false,
    "handoff_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteAssistant_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WebsiteAssistantDomain
CREATE TABLE "WebsiteAssistantDomain" (
    "id" TEXT NOT NULL,
    "assistant_id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "verification_status" TEXT NOT NULL DEFAULT 'pending',
    "verification_token" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteAssistantDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WebsiteKnowledgeSource
CREATE TABLE "WebsiteKnowledgeSource" (
    "id" TEXT NOT NULL,
    "assistant_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_label" TEXT NOT NULL,
    "source_url" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "crawl_status" TEXT,
    "last_crawled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteKnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WebsiteVisitor
CREATE TABLE "WebsiteVisitor" (
    "id" TEXT NOT NULL,
    "assistant_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "visitor_fingerprint" TEXT NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "visit_count" INTEGER NOT NULL DEFAULT 1,
    "is_returning" BOOLEAN NOT NULL DEFAULT false,
    "country_code" TEXT,
    "country_name" TEXT,
    "region_name" TEXT,
    "city_name" TEXT,
    "first_referrer" TEXT,
    "first_landing_url" TEXT,
    "last_landing_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WebsiteVisitSession
CREATE TABLE "WebsiteVisitSession" (
    "id" TEXT NOT NULL,
    "assistant_id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "referrer_url" TEXT,
    "landing_url" TEXT,
    "entry_path" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "browser_name" TEXT,
    "device_type" TEXT,
    "os_name" TEXT,
    "ip_hash" TEXT,
    "ip_country_code" TEXT,
    "ip_country_name" TEXT,
    "event_count" INTEGER NOT NULL DEFAULT 0,
    "chat_opened" BOOLEAN NOT NULL DEFAULT false,
    "chat_started" BOOLEAN NOT NULL DEFAULT false,
    "lead_captured" BOOLEAN NOT NULL DEFAULT false,
    "handoff_requested" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteVisitSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WebsiteEvent
CREATE TABLE "WebsiteEvent" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "assistant_id" TEXT NOT NULL,
    "visitor_id" TEXT,
    "session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "page_url" TEXT,
    "page_path" TEXT,
    "event_value" TEXT,
    "metadata" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebsiteAssistant_public_embed_key_key" ON "WebsiteAssistant"("public_embed_key");
CREATE INDEX "WebsiteAssistant_tenant_id_idx" ON "WebsiteAssistant"("tenant_id");
CREATE INDEX "WebsiteAssistant_status_idx" ON "WebsiteAssistant"("status");

CREATE UNIQUE INDEX "WebsiteAssistantDomain_assistant_id_hostname_key" ON "WebsiteAssistantDomain"("assistant_id", "hostname");
CREATE INDEX "WebsiteAssistantDomain_hostname_idx" ON "WebsiteAssistantDomain"("hostname");

CREATE INDEX "WebsiteKnowledgeSource_assistant_id_idx" ON "WebsiteKnowledgeSource"("assistant_id");

CREATE UNIQUE INDEX "WebsiteVisitor_assistant_id_visitor_fingerprint_key" ON "WebsiteVisitor"("assistant_id", "visitor_fingerprint");
CREATE INDEX "WebsiteVisitor_tenant_id_idx" ON "WebsiteVisitor"("tenant_id");
CREATE INDEX "WebsiteVisitor_last_seen_at_idx" ON "WebsiteVisitor"("last_seen_at");

CREATE UNIQUE INDEX "WebsiteVisitSession_session_token_key" ON "WebsiteVisitSession"("session_token");
CREATE INDEX "WebsiteVisitSession_tenant_id_idx" ON "WebsiteVisitSession"("tenant_id");
CREATE INDEX "WebsiteVisitSession_assistant_id_idx" ON "WebsiteVisitSession"("assistant_id");
CREATE INDEX "WebsiteVisitSession_started_at_idx" ON "WebsiteVisitSession"("started_at");

CREATE INDEX "WebsiteEvent_tenant_id_idx" ON "WebsiteEvent"("tenant_id");
CREATE INDEX "WebsiteEvent_assistant_id_occurred_at_idx" ON "WebsiteEvent"("assistant_id", "occurred_at");
CREATE INDEX "WebsiteEvent_event_type_idx" ON "WebsiteEvent"("event_type");

ALTER TABLE "WebsiteAssistant"
    ADD CONSTRAINT "WebsiteAssistant_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebsiteAssistantDomain"
    ADD CONSTRAINT "WebsiteAssistantDomain_assistant_id_fkey"
    FOREIGN KEY ("assistant_id") REFERENCES "WebsiteAssistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebsiteKnowledgeSource"
    ADD CONSTRAINT "WebsiteKnowledgeSource_assistant_id_fkey"
    FOREIGN KEY ("assistant_id") REFERENCES "WebsiteAssistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebsiteVisitor"
    ADD CONSTRAINT "WebsiteVisitor_assistant_id_fkey"
    FOREIGN KEY ("assistant_id") REFERENCES "WebsiteAssistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebsiteVisitor"
    ADD CONSTRAINT "WebsiteVisitor_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebsiteVisitSession"
    ADD CONSTRAINT "WebsiteVisitSession_assistant_id_fkey"
    FOREIGN KEY ("assistant_id") REFERENCES "WebsiteAssistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebsiteVisitSession"
    ADD CONSTRAINT "WebsiteVisitSession_visitor_id_fkey"
    FOREIGN KEY ("visitor_id") REFERENCES "WebsiteVisitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebsiteVisitSession"
    ADD CONSTRAINT "WebsiteVisitSession_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebsiteEvent"
    ADD CONSTRAINT "WebsiteEvent_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebsiteEvent"
    ADD CONSTRAINT "WebsiteEvent_assistant_id_fkey"
    FOREIGN KEY ("assistant_id") REFERENCES "WebsiteAssistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebsiteEvent"
    ADD CONSTRAINT "WebsiteEvent_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "WebsiteVisitSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
