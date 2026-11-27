-- Idempotent migration for Partner Credits (Admin onboarding, dual-admin approval, partner allocations & activity ledger)
CREATE TABLE IF NOT EXISTS "public"."partner_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "organization_id" UUID,
    "user_id" UUID,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending_approval',
    "credits_issued" DECIMAL(15, 2) NOT NULL DEFAULT 0,
    "credits_used" DECIMAL(15, 2) NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "eligible_categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rules_note" TEXT,
    "max_per_campaign" DECIMAL(15, 2),
    "employee_matching_enabled" BOOLEAN NOT NULL DEFAULT false,
    "matching_ratio" VARCHAR(16) DEFAULT '1:1',
    "reconciliation_ref" VARCHAR(128),
    "payment_reconciled" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "partner_since" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."partner_credit_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partner_id" UUID NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "amount" DECIMAL(15, 2) NOT NULL,
    "cause_id" UUID,
    "cause_title" TEXT,
    "donation_id" UUID,
    "show_as_supporter" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_credit_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."partner_credit_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partner_id" UUID NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "amount" DECIMAL(15, 2) NOT NULL,
    "reconciliation_ref" VARCHAR(128),
    "note" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending_approval',
    "requested_by_id" UUID NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_credit_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_accounts_contact_email_key" ON "public"."partner_accounts"("contact_email");
CREATE INDEX IF NOT EXISTS "idx_partner_accounts_status" ON "public"."partner_accounts"("status");
CREATE INDEX IF NOT EXISTS "idx_partner_accounts_user_id" ON "public"."partner_accounts"("user_id");
CREATE INDEX IF NOT EXISTS "idx_partner_accounts_expires_at" ON "public"."partner_accounts"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_partner_credit_tx_partner_created" ON "public"."partner_credit_transactions"("partner_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_partner_credit_tx_partner_cause" ON "public"."partner_credit_transactions"("partner_id", "cause_id");
CREATE INDEX IF NOT EXISTS "idx_partner_credit_req_status_created" ON "public"."partner_credit_requests"("status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_partner_credit_req_partner_id" ON "public"."partner_credit_requests"("partner_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'partner_credit_transactions_partner_id_fkey'
    ) THEN
        ALTER TABLE "public"."partner_credit_transactions"
            ADD CONSTRAINT "partner_credit_transactions_partner_id_fkey"
            FOREIGN KEY ("partner_id") REFERENCES "public"."partner_accounts"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'partner_credit_requests_partner_id_fkey'
    ) THEN
        ALTER TABLE "public"."partner_credit_requests"
            ADD CONSTRAINT "partner_credit_requests_partner_id_fkey"
            FOREIGN KEY ("partner_id") REFERENCES "public"."partner_accounts"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_partner_accounts_credits_bounds'
    ) THEN
        ALTER TABLE "public"."partner_accounts"
            ADD CONSTRAINT "chk_partner_accounts_credits_bounds"
            CHECK ("credits_used" >= 0 AND "credits_used" <= "credits_issued");
    END IF;
END $$;
