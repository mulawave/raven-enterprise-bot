/*
  Warnings:

  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserScope" AS ENUM ('SYSTEM', 'TENANT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'admin', 'owner', 'staff');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "scope" "UserScope" NOT NULL DEFAULT 'TENANT',
ALTER COLUMN "tenant_id" DROP NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL;

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_tier" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "conversations_used" INTEGER NOT NULL DEFAULT 0,
    "conversations_limit" INTEGER NOT NULL,
    "overage_cost_kobo" INTEGER NOT NULL DEFAULT 0,
    "paystack_plan_code" TEXT,
    "paystack_subscription_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenant_id_key" ON "Subscription"("tenant_id");

-- CreateIndex
CREATE INDEX "Subscription_tenant_id_idx" ON "Subscription"("tenant_id");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_current_period_end_idx" ON "Subscription"("current_period_end");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_scope_idx" ON "User"("scope");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
