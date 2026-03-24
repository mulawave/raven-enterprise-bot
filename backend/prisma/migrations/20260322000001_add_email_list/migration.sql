-- CreateTable
CREATE TABLE "EmailList" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailList_tenant_id_idx" ON "EmailList"("tenant_id");

-- CreateIndex
CREATE INDEX "EmailList_email_idx" ON "EmailList"("email");

-- CreateIndex
CREATE INDEX "EmailList_created_at_idx" ON "EmailList"("created_at");

-- AddForeignKey
ALTER TABLE "EmailList" ADD CONSTRAINT "EmailList_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
