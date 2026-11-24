import { NextRequest, NextResponse } from "next/server";
import { searchDiscover } from "@/actions/causes/discover-actions";

/**
 * GET /api/search?q=…
 *
 * A thin, cache-free HTTP endpoint for the inline search panel. It exists
 * so the hook can abort in-flight requests (fetch + AbortController) —
 * something a server action can't do. Search results are per-keystroke and
 * only shown while the user is actively typing, so nothing is cached:
 * responses are marked no-store and the endpoint stays lean.
 */

const SEARCH_MAX_LENGTH = 100;

const emptyResponse = {
  campaigns: [],
  petitions: [],
  organizations: [],
  totalCount: 0,
};

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "")
    .trim()
    .slice(0, SEARCH_MAX_LENGTH);

  // The panel only requests with a query; an empty one gets an empty
  // payload rather than a pointless database round-trip.
  if (!q) {
    return NextResponse.json(emptyResponse, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const data = await searchDiscover(q);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
