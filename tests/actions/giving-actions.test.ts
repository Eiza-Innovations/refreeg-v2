/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    donation: { findMany: jest.fn() },
    pledges: { findMany: jest.fn() },
    subscriptions: { findMany: jest.fn() },
    bookmark: { count: jest.fn() },
    user: { findUnique: jest.fn() },
    cause: { findMany: jest.fn() },
    campaign_proof_updates: { findMany: jest.fn() },
    wishlist_contributions: { findMany: jest.fn() },
  },
}));
jest.mock("@/lib/auth/session-user", () => ({ getSessionUser: jest.fn() }));

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session-user";
import { getGivingOverview } from "@/actions/donations/giving-actions";

const db = prisma as any;
const NOW = new Date("2026-10-05T12:00:00Z");

const cause = (id: string, category = "education") => ({
  id,
  title: `Cause ${id}`,
  slug: id,
  image: null,
  category,
  user: { fullName: "Lagos Education Trust" },
});

const donation = (
  id: string,
  causeId: string,
  amount: number,
  iso: string,
  category?: string,
) => ({
  id,
  amount,
  createdAt: new Date(iso),
  cause: cause(causeId, category),
});

function seed({
  donations = [] as any[],
  pledges = [] as any[],
  subscriptions = [] as any[],
  delivered = [] as string[],
  extraCauses = [] as any[],
  wishlistGifts = [] as any[],
} = {}) {
  db.donation.findMany.mockResolvedValue(donations);
  db.pledges.findMany.mockResolvedValue(pledges);
  db.subscriptions.findMany.mockResolvedValue(subscriptions);
  db.bookmark.count.mockResolvedValue(12);
  db.user.findUnique.mockResolvedValue({
    total_points: 2418,
    username: "amara",
  });
  db.cause.findMany.mockResolvedValue(extraCauses);
  db.campaign_proof_updates.findMany.mockResolvedValue(
    delivered.map((cause_id) => ({ cause_id })),
  );
  db.wishlist_contributions.findMany.mockResolvedValue(wishlistGifts);
}

const wishlistGift = (
  id: string,
  itemName: string,
  wishlistTitle: string,
  amount: number,
  iso: string,
) => ({
  id,
  amount,
  created_at: new Date(iso),
  item: {
    name: itemName,
    wishlist: { title: wishlistTitle, slug: "nomsos-wishlist" },
  },
});

describe("getGivingOverview", () => {
  beforeAll(() => jest.useFakeTimers().setSystemTime(NOW));
  afterAll(() => jest.useRealTimers());
  beforeEach(() => {
    jest.clearAllMocks();
    (getSessionUser as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "amara@example.com",
    });
  });

  it("returns null when signed out", async () => {
    (getSessionUser as jest.Mock).mockResolvedValue(null);
    await expect(getGivingOverview()).resolves.toBeNull();
  });

  it("reports an empty account", async () => {
    seed();
    const overview = await getGivingOverview();
    expect(overview?.isEmpty).toBe(true);
    expect(overview?.savedCount).toBe(12);
  });

  it("marks gifts delivered when the campaign has approved proof", async () => {
    seed({
      donations: [
        donation("d1", "c1", 25000, "2026-08-12"),
        donation("d2", "c2", 10000, "2026-08-02"),
      ],
      delivered: ["c1"],
    });

    const overview = await getGivingOverview();

    expect(overview?.gifts.map((g) => [g.id, g.status])).toEqual([
      ["d1", "delivered"],
      ["d2", "in-progress"],
    ]);
    expect(overview?.headline.deliveredCount).toBe(1);
    expect(overview?.headline.amount).toBe(35000);
  });

  it("splits totals by period and compares with last year", async () => {
    seed({
      donations: [
        donation("d1", "c1", 186000, "2026-03-01"),
        donation("d2", "c2", 112000, "2025-06-01", "business"),
        donation("d3", "c3", 114000, "2024-03-10"),
      ],
    });

    const overview = await getGivingOverview({ period: "year" });

    expect(overview?.periodTotals).toEqual({
      year: 186000,
      "last-year": 112000,
      all: 412000,
    });
    expect(overview?.stats.thisYear).toBe(186000);
    expect(overview?.stats.lastYear).toBe(112000);
    expect(overview?.gifts.map((g) => g.id)).toEqual(["d1"]);
    expect(overview?.givenByCause).toEqual([
      { category: "education", label: "Education", amount: 186000 },
    ]);
  });

  it("counts wishlist gifts as giving alongside cause donations", async () => {
    seed({
      donations: [donation("d1", "c1", 50000, "2026-08-12")],
      wishlistGifts: [
        wishlistGift(
          "wg1",
          "A new study desk",
          "Nomso's Wishlist",
          25000,
          "2026-09-20",
        ),
        wishlistGift(
          "wg2",
          "Fuel for the year",
          "Nomso's Wishlist",
          5000,
          "2025-12-01",
        ),
      ],
    });

    const overview = await getGivingOverview();

    // Both years count toward the headline; the default list shows the
    // donation first, then the two wishlist gifts newest first.
    expect(overview?.periodTotals).toEqual({
      year: 75000,
      "last-year": 5000,
      all: 80000,
    });
    expect(overview?.headline.amount).toBe(80000);
    expect(overview?.headline.wishlistCount).toBe(2);
    expect(overview?.givenByCause).toEqual([
      { category: "education", label: "Education", amount: 50000 },
      { category: "wishlists", label: "Wishlists", amount: 30000 },
    ]);
    expect(overview?.gifts.map((g) => [g.kind, g.id, g.status])).toEqual([
      ["donation", "d1", "in-progress"],
      ["wishlist-gift", "wg1", "given"],
      ["wishlist-gift", "wg2", "given"],
    ]);
    const wishlistRow = overview?.gifts.find((g) => g.id === "wg1");
    expect(wishlistRow).toMatchObject({
      title: "A new study desk",
      owner: "Nomso's Wishlist",
      href: "/amara/nomsos-wishlist",
    });
    // Wishlist gifts stay out of the cause-specific filters.
    const delivered = await getGivingOverview({ filter: "delivered" });
    expect(delivered?.gifts.map((g) => g.id)).toEqual([]);
  });

  it("includes open pledges, including ones made by email before sign-up", async () => {
    seed({
      pledges: [
        {
          id: "p1",
          amount: 25000,
          reminder_date: new Date("2026-10-12"),
          cause_id: "c9",
        },
      ],
      extraCauses: [cause("c9")],
    });

    const overview = await getGivingOverview({ filter: "pledges" });

    expect(db.pledges.findMany.mock.calls[0][0].where.OR).toEqual([
      { user_id: "user-1" },
      { user_id: null, email: "amara@example.com" },
    ]);
    expect(overview?.stats.openPledges).toEqual({ amount: 25000, count: 1 });
    expect(overview?.gifts).toEqual([
      expect.objectContaining({ id: "p1", kind: "pledge", status: "pledge" }),
    ]);
  });

  it("filters the list by search text on title or organiser", async () => {
    seed({
      donations: [
        donation("d1", "school", 25000, "2026-08-12"),
        donation("d2", "water", 10000, "2026-08-02"),
      ],
    });

    const byTitle = await getGivingOverview({ q: "cause water" });
    expect(byTitle?.gifts.map((g) => g.id)).toEqual(["d2"]);

    const byOwner = await getGivingOverview({ q: "education trust" });
    expect(byOwner?.gifts).toHaveLength(2);
  });

  it("works out the next monthly charge from the start day", async () => {
    seed({
      subscriptions: [
        {
          id: "s1",
          amount: 5000,
          interval: "monthly",
          created_at: new Date("2025-05-01T09:00:00Z"),
          cause_id: "c1",
        },
      ],
      extraCauses: [cause("c1")],
    });

    const overview = await getGivingOverview();

    expect(overview?.stats.monthly.amount).toBe(5000);
    const next = new Date(overview!.stats.monthly.nextCharge!);
    expect([next.getFullYear(), next.getMonth(), next.getDate()]).toEqual([
      2026, 10, 1,
    ]);
  });
});
