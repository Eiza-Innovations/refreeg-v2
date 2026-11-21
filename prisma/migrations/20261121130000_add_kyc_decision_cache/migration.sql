-- Cached Didit decision fields. Some databases already have these from a
-- schema push, so the adds are idempotent.
ALTER TABLE "public"."kyc_verifications"
  ADD COLUMN IF NOT EXISTS "face_match_score" INTEGER,
  ADD COLUMN IF NOT EXISTS "id_type" TEXT,
  ADD COLUMN IF NOT EXISTS "id_number" TEXT,
  ADD COLUMN IF NOT EXISTS "checks_passed" INTEGER,
  ADD COLUMN IF NOT EXISTS "checks_total" INTEGER;
