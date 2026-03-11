-- Migration: add_payouts_kyc_bank_withdrawal
-- Adds TenantKyc, TenantBankAccount, and Withdrawal models

-- TenantKyc
CREATE TABLE "TenantKyc" (
    "id"           TEXT NOT NULL,
    "tenant_id"    TEXT NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'pending',
    "full_name"    TEXT,
    "id_type"      TEXT,
    "id_number"    TEXT,
    "submitted_at" TIMESTAMP(3),
    "verified_at"  TIMESTAMP(3),
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantKyc_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantKyc_tenant_id_key" ON "TenantKyc"("tenant_id");
CREATE INDEX "TenantKyc_tenant_id_idx" ON "TenantKyc"("tenant_id");

ALTER TABLE "TenantKyc"
    ADD CONSTRAINT "TenantKyc_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TenantBankAccount
CREATE TABLE "TenantBankAccount" (
    "id"             TEXT NOT NULL,
    "tenant_id"      TEXT NOT NULL,
    "bank_name"      TEXT NOT NULL,
    "bank_code"      TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name"   TEXT NOT NULL,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantBankAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantBankAccount_tenant_id_key" ON "TenantBankAccount"("tenant_id");
CREATE INDEX "TenantBankAccount_tenant_id_idx" ON "TenantBankAccount"("tenant_id");

ALTER TABLE "TenantBankAccount"
    ADD CONSTRAINT "TenantBankAccount_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Withdrawal
CREATE TABLE "Withdrawal" (
    "id"             TEXT NOT NULL,
    "tenant_id"      TEXT NOT NULL,
    "amount_kobo"    INTEGER NOT NULL,
    "account_number" TEXT NOT NULL,
    "bank_code"      TEXT NOT NULL,
    "bank_name"      TEXT NOT NULL,
    "account_name"   TEXT NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'pending',
    "provider"       TEXT NOT NULL DEFAULT 'flutterwave',
    "reference"      TEXT NOT NULL,
    "provider_ref"   TEXT,
    "failure_reason" TEXT,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Withdrawal_reference_key" ON "Withdrawal"("reference");
CREATE INDEX "Withdrawal_tenant_id_idx" ON "Withdrawal"("tenant_id");
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");

ALTER TABLE "Withdrawal"
    ADD CONSTRAINT "Withdrawal_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
