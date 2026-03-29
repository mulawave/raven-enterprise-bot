-- AlterTable
ALTER TABLE "TenantFaq" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TenantFaq" ADD COLUMN "source" TEXT;
ALTER TABLE "TenantFaq" ADD COLUMN "source_conversation_id" TEXT;

-- CreateIndex
CREATE INDEX "TenantFaq_tenant_id_hidden_idx" ON "TenantFaq"("tenant_id", "hidden");
