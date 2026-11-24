-- Search: full-text + trigram indexes (see lib/causes/search-fts.ts).
--
-- These are pure-SQL expression indexes; the Prisma schema does not model
-- them, so this repo's hand-written migrations workflow (migrate deploy)
-- must apply this file directly — `migrate dev` diffing would want to drop
-- them. The app degrades to plain ILIKE contains if they are missing.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text: word matching over title + description ('simple' config
-- keeps stemming language-neutral for mixed Nigerian text).
CREATE INDEX IF NOT EXISTS idx_causes_fts
  ON causes USING gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_petitions_fts
  ON petitions USING gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Trigram: accelerates the existing `contains insensitive` (ILIKE '%q%')
-- predicates and enables `title % $1` typo-tolerance matching.
CREATE INDEX IF NOT EXISTS idx_causes_title_trgm
  ON causes USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_petitions_title_trgm
  ON petitions USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_organizations_name_trgm
  ON organizations USING gin (name gin_trgm_ops);
