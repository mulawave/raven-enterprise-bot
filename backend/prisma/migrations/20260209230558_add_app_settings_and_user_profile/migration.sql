-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "name" TEXT;

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "company_name" TEXT,
    "company_address" TEXT,
    "company_email" TEXT,
    "company_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
