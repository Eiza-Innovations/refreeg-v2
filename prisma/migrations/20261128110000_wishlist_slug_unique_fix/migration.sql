-- Drift reconciliation (no reset): the live database still carries a slug-only
-- unique index on "wishlists" from the pre-edit version of 20261125120000_wishlist_init,
-- while the migration history and prisma/schema expect the composite
-- UNIQUE("user_id", "slug") named "uq_wishlists_user_slug".

-- 1. Drop the drifted slug-only unique index (Prisma's default name for @@unique([slug])).
DROP INDEX IF EXISTS "wishlists_slug_key";

-- If pg says the index backs a constraint, drop the constraint instead:
--   ALTER TABLE "wishlists" DROP CONSTRAINT "wishlists_slug_key";

-- 2. Restore the composite unique the schema expects.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_wishlists_user_slug" ON "public"."wishlists"("user_id","slug");

-- 3. Loud guard: fail if any unique index on exactly (slug) is still standing,
--    so drift cannot silently survive under an unexpected index name.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_index pi
    JOIN pg_class i ON i.oid = pi.indexrelid
    JOIN pg_class t ON t.oid = pi.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = pi.indkey[0]
    WHERE t.relname = 'wishlists'
      AND n.nspname = 'public'
      AND pi.indisunique
      AND array_length(pi.indkey, 1) = 1
      AND a.attname = 'slug'
  ) THEN
    RAISE EXCEPTION 'Drift remains: a unique index on wishlists(slug) still exists. Inspect it with: SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = ''public'' AND tablename = ''wishlists''; then drop it by its real name and re-run this script.';
  END IF;
END $$;
