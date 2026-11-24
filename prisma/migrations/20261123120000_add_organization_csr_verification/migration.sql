-- Organisation CSR giving + document verification (design A2-A5). Some
-- databases may already carry these columns from a schema push, so every
-- statement is idempotent.
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "organisation_type" TEXT,
  ADD COLUMN IF NOT EXISTS "registration_number" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "purpose" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_role" TEXT,
  ADD COLUMN IF NOT EXISTS "csr_budget" DECIMAL,
  ADD COLUMN IF NOT EXISTS "csr_financial_year_start" TEXT,
  ADD COLUMN IF NOT EXISTS "csr_focus_causes" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "csr_match_employee_donations" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "csr_match_cap" DECIMAL,
  ADD COLUMN IF NOT EXISTS "csr_public_report" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verification_status" TEXT NOT NULL DEFAULT 'unverified';

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "organization_purpose" TEXT;

CREATE TABLE IF NOT EXISTS "organization_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "registration_doc_key" TEXT NOT NULL,
    "director_id_keys" TEXT[] NOT NULL DEFAULT '{}',
    "note" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organization_verifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "organization_verifications_organization_id_status_idx"
  ON "organization_verifications"("organization_id", "status");

DO $$
BEGIN
  ALTER TABLE "organization_verifications"
    ADD CONSTRAINT "organization_verifications_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
