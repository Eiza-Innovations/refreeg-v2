const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/**
 * Parse and clamp `limit` and `offset` query params so list endpoints never
 * execute unbounded Prisma `findMany` scans or throw on negative/NaN inputs.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  options?: { defaultLimit?: number; maxLimit?: number },
): { limit: number; offset: number } {
  const defaultLimit = options?.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = options?.maxLimit ?? MAX_LIMIT;

  const parsedLimit = Number.parseInt(searchParams.get("limit") || "", 10);
  const parsedOffset = Number.parseInt(searchParams.get("offset") || "", 10);

  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(1, parsedLimit), maxLimit)
    : defaultLimit;

  const offset =
    Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  return { limit, offset };
}
