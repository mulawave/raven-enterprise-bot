-- CreateTable
CREATE TABLE "TenantFaq" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantFaq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantFaq_tenant_id_idx" ON "TenantFaq"("tenant_id");

-- CreateIndex
CREATE INDEX "TenantFaq_tenant_id_sort_order_idx" ON "TenantFaq"("tenant_id", "sort_order");

-- AddForeignKey
ALTER TABLE "TenantFaq" ADD CONSTRAINT "TenantFaq_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
