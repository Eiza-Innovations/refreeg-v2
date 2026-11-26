jest.mock("@/lib/prisma", () => ({
  prisma: { petitions: { findMany: jest.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { listUserPetitionsWithStatus } from "@/lib/petitions/user-petitions";

const findMany = (prisma as unknown as { petitions: { findMany: jest.Mock } })
  .petitions.findMany;

describe("listUserPetitionsWithStatus", () => {
  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([
      {
        id: "p1",
        goal: "500",
        raised: "0",
        created_at: new Date("2026-11-26T00:00:00Z"),
        updated_at: new Date("2026-11-26T00:00:00Z"),
      },
    ]);
  });

  it("limits to one status and converts numbers and dates", async () => {
    const [petition] = await listUserPetitionsWithStatus("u1", "pending");

    expect(findMany).toHaveBeenCalledWith({
      where: { user_id: "u1", status: "pending" },
      orderBy: { created_at: "desc" },
    });
    expect(petition.goal).toBe(500);
    expect(petition.created_at).toBe("2026-11-26T00:00:00.000Z");
  });

  it("returns every status for all", async () => {
    await listUserPetitionsWithStatus("u1", "all");

    expect(findMany).toHaveBeenCalledWith({
      where: { user_id: "u1" },
      orderBy: { created_at: "desc" },
    });
  });
});
