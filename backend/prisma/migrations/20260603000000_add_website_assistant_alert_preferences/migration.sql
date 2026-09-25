-- CreateTable: WebsiteAssistantAlertPreference
CREATE TABLE "WebsiteAssistantAlertPreference" (
    "id" TEXT NOT NULL,
    "assistant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notify_new_visitor" BOOLEAN NOT NULL DEFAULT true,
    "notify_chat_started" BOOLEAN NOT NULL DEFAULT true,
    "notify_lead_captured" BOOLEAN NOT NULL DEFAULT true,
    "notify_handoff_requested" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteAssistantAlertPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebsiteAssistantAlertPreference_assistant_id_user_id_key" ON "WebsiteAssistantAlertPreference"("assistant_id", "user_id");
CREATE INDEX "WebsiteAssistantAlertPreference_assistant_id_idx" ON "WebsiteAssistantAlertPreference"("assistant_id");
CREATE INDEX "WebsiteAssistantAlertPreference_user_id_idx" ON "WebsiteAssistantAlertPreference"("user_id");

ALTER TABLE "WebsiteAssistantAlertPreference"
    ADD CONSTRAINT "WebsiteAssistantAlertPreference_assistant_id_fkey"
    FOREIGN KEY ("assistant_id") REFERENCES "WebsiteAssistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebsiteAssistantAlertPreference"
    ADD CONSTRAINT "WebsiteAssistantAlertPreference_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
