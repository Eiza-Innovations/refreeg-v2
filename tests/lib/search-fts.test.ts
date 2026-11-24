/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: jest.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { ftsCauseIds, ftsPetitionIds } from "@/lib/causes/search-fts";

const db = prisma as any;

describe("search-fts (graceful full-text helper)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns matching ids from the full-text/trigram query", async () => {
    db.$queryRawUnsafe.mockResolvedValue([{ id: "c-1" }, { id: "c-2" }]);

    await expect(ftsCauseIds("school meals")).resolves.toEqual(["c-1", "c-2"]);
    expect(db.$queryRawUnsafe).toHaveBeenCalledTimes(1);

    const [sql, ...args] = db.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain("websearch_to_tsquery('simple'");
    expect(sql).toContain("title % $2");
    expect(sql).toContain("FROM causes");
    expect(args).toEqual(["school meals", "school meals", "school meals", 400]);
  });

  it("queries the petitions table for petitions", async () => {
    db.$queryRawUnsafe.mockResolvedValue([]);

    await expect(ftsPetitionIds("climate")).resolves.toEqual([]);
    expect(db.$queryRawUnsafe.mock.calls[0][0]).toContain("FROM petitions");
  });

  it("degrades to null when the database lacks the index/extension", async () => {
    // e.g. migration not applied yet, or pg_trgm unavailable
    db.$queryRawUnsafe.mockRejectedValue(
      new Error("function similarity(text, unknown) does not exist"),
    );

    await expect(ftsCauseIds("school")).resolves.toBeNull();
  });

  it("degrades to null when prisma has no raw-query surface (unit tests)", async () => {
    const original = db.$queryRawUnsafe;
    db.$queryRawUnsafe = undefined;

    await expect(ftsCauseIds("school")).resolves.toBeNull();

    db.$queryRawUnsafe = original;
  });
});
