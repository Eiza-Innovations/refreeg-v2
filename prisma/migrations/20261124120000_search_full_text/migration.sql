-- Search: full-text + trigram indexes (see lib/causes/search-fts.ts).
--
-- The three trigram column indexes are declared in prisma/schema
-- (@@index … type: Gin, ops: raw("gin_trgm_ops"), same map: names), so the
-- CI drift check (migrate diff --from-url vs prisma/schema) and migrate dev
-- both stay clean. The two FTS expression indexes are pure SQL Prisma
-- cannot model; introspection skips unmodelable expression indexes, so they
-- produce no drift. The app degrades to plain ILIKE contains if any of
-- these are missing.
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
