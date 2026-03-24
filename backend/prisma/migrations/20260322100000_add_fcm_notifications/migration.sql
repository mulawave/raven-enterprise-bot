-- CreateTable: FcmToken — device push tokens per user/tenant
CREATE TABLE "FcmToken" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT,
    "tenant_id"  TEXT,
    "token"      TEXT NOT NULL,
    "platform"   TEXT NOT NULL DEFAULT 'web',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FcmToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AppNotification — persisted in-app notifications
CREATE TABLE "AppNotification" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT,
    "tenant_id"  TEXT,
    "title"      TEXT NOT NULL,
    "body"       TEXT NOT NULL,
    "type"       TEXT NOT NULL,
    "data"       TEXT,
    "read"       BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

-- Unique FCM token
CREATE UNIQUE INDEX "FcmToken_token_key" ON "FcmToken"("token");

-- FcmToken indexes
CREATE INDEX "FcmToken_user_id_idx"   ON "FcmToken"("user_id");
CREATE INDEX "FcmToken_tenant_id_idx" ON "FcmToken"("tenant_id");
CREATE INDEX "FcmToken_token_idx"     ON "FcmToken"("token");

-- AppNotification indexes
CREATE INDEX "AppNotification_user_id_idx"   ON "AppNotification"("user_id");
CREATE INDEX "AppNotification_tenant_id_idx" ON "AppNotification"("tenant_id");
CREATE INDEX "AppNotification_read_idx"      ON "AppNotification"("read");
CREATE INDEX "AppNotification_created_at_idx" ON "AppNotification"("created_at");

-- AddForeignKey
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
