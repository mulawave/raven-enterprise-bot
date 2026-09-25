-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'REGULAR',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "buyer_email" TEXT NOT NULL,
    "buyer_name" TEXT NOT NULL,
    "max_domains" INTEGER NOT NULL DEFAULT 1,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseActivation" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "ip_address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "activated_at" TIMESTAMP(3),
    "last_verified_at" TIMESTAMP(3),
    "fingerprint" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseActivation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationAttempt" (
    "id" TEXT NOT NULL,
    "license_key_partial" TEXT,
    "domain" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "email" TEXT,
    "user_agent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REJECTED',
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstanceActivation" (
    "id" TEXT NOT NULL,
    "license_key_hash" TEXT NOT NULL,
    "license_type" TEXT NOT NULL DEFAULT 'REGULAR',
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "activated_at" TIMESTAMP(3),
    "last_verified_at" TIMESTAMP(3),
    "verification_token" TEXT,
    "fingerprint" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstanceActivation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "License_key_hash_key" ON "License"("key_hash");

-- CreateIndex
CREATE INDEX "License_buyer_email_idx" ON "License"("buyer_email");

-- CreateIndex
CREATE INDEX "License_status_idx" ON "License"("status");

-- CreateIndex
CREATE INDEX "License_type_idx" ON "License"("type");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseActivation_license_id_domain_key" ON "LicenseActivation"("license_id", "domain");

-- CreateIndex
CREATE INDEX "LicenseActivation_license_id_idx" ON "LicenseActivation"("license_id");

-- CreateIndex
CREATE INDEX "LicenseActivation_domain_idx" ON "LicenseActivation"("domain");

-- CreateIndex
CREATE INDEX "LicenseActivation_status_idx" ON "LicenseActivation"("status");

-- CreateIndex
CREATE INDEX "ActivationAttempt_ip_address_idx" ON "ActivationAttempt"("ip_address");

-- CreateIndex
CREATE INDEX "ActivationAttempt_domain_idx" ON "ActivationAttempt"("domain");

-- CreateIndex
CREATE INDEX "ActivationAttempt_email_idx" ON "ActivationAttempt"("email");

-- CreateIndex
CREATE INDEX "ActivationAttempt_status_idx" ON "ActivationAttempt"("status");

-- CreateIndex
CREATE INDEX "ActivationAttempt_created_at_idx" ON "ActivationAttempt"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "InstanceActivation_domain_key" ON "InstanceActivation"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "InstanceActivation_verification_token_key" ON "InstanceActivation"("verification_token");

-- CreateIndex
CREATE INDEX "InstanceActivation_status_idx" ON "InstanceActivation"("status");

-- CreateIndex
CREATE INDEX "InstanceActivation_domain_idx" ON "InstanceActivation"("domain");

-- AddForeignKey
ALTER TABLE "LicenseActivation" ADD CONSTRAINT "LicenseActivation_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;
