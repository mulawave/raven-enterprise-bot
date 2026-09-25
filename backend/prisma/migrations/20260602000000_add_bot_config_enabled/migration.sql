-- AlterTable: add enabled column to TenantBotConfig with default false
ALTER TABLE "TenantBotConfig" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT false;
