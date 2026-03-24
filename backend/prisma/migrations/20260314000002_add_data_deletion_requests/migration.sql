-- CreateTable
CREATE TABLE "DataDeletionRequest" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "confirmation_code" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "identifier_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataDeletionRequest_confirmation_code_key" ON "DataDeletionRequest"("confirmation_code");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_tenant_id_idx" ON "DataDeletionRequest"("tenant_id");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_status_idx" ON "DataDeletionRequest"("status");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_confirmation_code_idx" ON "DataDeletionRequest"("confirmation_code");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_identifier_idx" ON "DataDeletionRequest"("identifier");

-- AddForeignKey
ALTER TABLE "DataDeletionRequest" ADD CONSTRAINT "DataDeletionRequest_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
