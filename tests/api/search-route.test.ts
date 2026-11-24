/**
 * @jest-environment node
 */
jest.mock("@/actions/causes/discover-actions", () => ({
  searchDiscover: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/search/route";
import { searchDiscover } from "@/actions/causes/discover-actions";

const request = (query?: string) =>
  new NextRequest(`http://localhost:3000/api/search${query ?? ""}`);

const searchPayload = (overrides: Record<string, unknown> = {}) => ({
  campaigns: [],
  petitions: [],
  organizations: [],
  totalCount: 0,
  ...overrides,
});

const EMPTY = {
  campaigns: [],
  petitions: [],
  organizations: [],
  totalCount: 0,
};

describe("GET /api/search (thin, cache-free)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("runs the query through searchDiscover and marks responses no-store", async () => {
    (searchDiscover as jest.Mock).mockResolvedValue(
      searchPayload({ totalCount: 5 }),
    );

    const res = await GET(request("?q=water"));

    expect(searchDiscover).toHaveBeenCalledWith("water");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toEqual(searchPayload({ totalCount: 5 }));
  });

  it("trims and caps the query", async () => {
    (searchDiscover as jest.Mock).mockResolvedValue(searchPayload());

    await GET(request(`?q=${encodeURIComponent("  water  ")}`));
    expect(searchDiscover).toHaveBeenLastCalledWith("water");

    await GET(request(`?q=${encodeURIComponent("x".repeat(150))}`));
    expect(searchDiscover).toHaveBeenLastCalledWith("x".repeat(100));
  });

  it("answers an empty payload for an empty query without touching the database", async () => {
    const res = await GET(request());

    expect(searchDiscover).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toEqual(EMPTY);
  });

  it("answers 502 when the search fails", async () => {
    (searchDiscover as jest.Mock).mockRejectedValue(new Error("db down"));

    const res = await GET(request("?q=water"));

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ error: "Search failed" });
  });
});
