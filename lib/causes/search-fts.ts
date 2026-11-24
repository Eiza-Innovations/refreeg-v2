import { prisma } from "@/lib/prisma";

const FTS_ID_LIMIT = 400;

const CAUSE_SQL = `
  SELECT id FROM causes
  WHERE to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
        @@ websearch_to_tsquery('simple', $1)
      OR title % $2
  ORDER BY ts_rank(to_tsvector('simple', coalesce(title, '')),
                   websearch_to_tsquery('simple', $3)) DESC,
           similarity(title, $3) DESC
  LIMIT $4`;

const PETITION_SQL = `
  SELECT id FROM petitions
  WHERE to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
        @@ websearch_to_tsquery('simple', $1)
      OR title % $2
  ORDER BY ts_rank(to_tsvector('simple', coalesce(title, '')),
                   websearch_to_tsquery('simple', $3)) DESC,
           similarity(title, $3) DESC
  LIMIT $4`;

async function ftsIds(sql: string, query: string): Promise<string[] | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      sql,
      query,
      query,
      query,
      FTS_ID_LIMIT,
    );
    return rows.map((r) => r.id);
  } catch {
    // Migration not applied / extension missing / mocked prisma — the
    // caller's `contains` predicate still stands on its own.
    return null;
  }
}

export function ftsCauseIds(query: string): Promise<string[] | null> {
  return ftsIds(CAUSE_SQL, query);
}

export function ftsPetitionIds(query: string): Promise<string[] | null> {
  return ftsIds(PETITION_SQL, query);
}
