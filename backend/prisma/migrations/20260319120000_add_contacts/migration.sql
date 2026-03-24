-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contact_tenant_id_phone_key" ON "Contact"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "Contact_tenant_id_idx" ON "Contact"("tenant_id");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
