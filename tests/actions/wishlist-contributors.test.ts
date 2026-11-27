jest.mock("@/lib/prisma", () => ({
  prisma: {
    wishlists: {
      findUnique: jest.fn(),
    },
    wishlist_contributions: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/services/mail", () => ({
  sendWishlistContributionEmail: jest.fn(),
  sendWishlistItemFundedEmail: jest.fn(),
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { getWishlistContributors } from "@/actions/wishlists/wishlist-actions";

const ownerRow = {
  id: "w-1",
  user_id: "owner-1",
  slug: "nomsos-wishlist",
  title: "Nomso's Wishlist",
  status: "active",
};

describe("getWishlistContributors (owner-only givers panel)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fails closed when unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const result = await getWishlistContributors("w-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
    expect(prisma.wishlist_contributions.findMany).not.toHaveBeenCalled();
  });

  it("fails closed for a non-owner session, leaking nothing", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "attacker-1" } });
    (prisma.wishlists.findUnique as jest.Mock).mockResolvedValue(ownerRow);

    const result = await getWishlistContributors("w-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Wishlist not found");
    expect(prisma.wishlist_contributions.findMany).not.toHaveBeenCalled();
  });

  it("fails closed when the wishlist does not exist", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "owner-1" } });
    (prisma.wishlists.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await getWishlistContributors("missing");

    expect(result.success).toBe(false);
    expect(prisma.wishlist_contributions.findMany).not.toHaveBeenCalled();
  });

  it("returns giver names to the owner with numbers mapped", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "owner-1" } });
    (prisma.wishlists.findUnique as jest.Mock).mockResolvedValue(ownerRow);
    // The rows still carry emails in the database; the action must drop
    // them rather than hand them to the owner.
    (prisma.wishlist_contributions.findMany as jest.Mock).mockResolvedValue([
      {
        id: "c-1",
        amount: "25000",
        name: "Adaeze",
        email: "adaeze@example.com",
        message: "Enjoy!",
        is_anonymous: false,
        created_at: new Date("2026-11-20T10:00:00Z"),
        item: { name: "A new study desk" },
      },
      {
        id: "c-2",
        amount: 5000,
        name: "Anonymous",
        email: "quiet@example.com",
        message: null,
        is_anonymous: true,
        created_at: null,
        item: { name: "Fuel for the year" },
      },
    ]);

    const result = await getWishlistContributors("w-1");

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data![0]).toMatchObject({
      itemName: "A new study desk",
      amount: 25_000,
      name: "Adaeze",
      createdAt: "2026-11-20T10:00:00.000Z",
    });
    expect(result.data![1]).toMatchObject({
      itemName: "Fuel for the year",
      amount: 5_000,
      isAnonymous: true,
      createdAt: null,
    });
    // Giver emails stay on the server for receipts only: the query never
    // selects them and the mapped rows never carry them.
    const selectArg = (prisma.wishlist_contributions.findMany as jest.Mock).mock
      .calls[0][0].select as Record<string, unknown>;
    expect(selectArg).not.toHaveProperty("email");
    for (const giver of result.data!) {
      expect(giver).not.toHaveProperty("email");
    }
    // The query is scoped through the wishlist's items, not global.
    expect(prisma.wishlist_contributions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { item: { wishlist_id: "w-1" } },
      }),
    );
  });
});
