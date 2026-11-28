jest.mock("@/lib/prisma", () => ({
  prisma: {
    wishlist_contributions: {
      findFirst: jest.fn(),
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

import { prisma } from "@/lib/prisma";
import { getWishlistGiftByReference } from "@/actions/wishlists/wishlist-actions";

const contributionRow = (overrides: Record<string, unknown> = {}) => ({
  amount: 5000,
  name: "Adaeze",
  is_anonymous: false,
  created_at: new Date("2026-11-25T09:30:00Z"),
  item: {
    name: "A new study desk",
    wishlist: {
      title: "Nomso's Christmas Wishlist",
      slug: "christmas",
      user: { username: "nomso" },
    },
  },
  ...overrides,
});

describe("getWishlistGiftByReference (received-page lookup)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps the ledger row to the public-safe confirmation", async () => {
    (prisma.wishlist_contributions.findFirst as jest.Mock).mockResolvedValue(
      contributionRow(),
    );

    const result = await getWishlistGiftByReference("ref_1");

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      itemName: "A new study desk",
      amount: 5000,
      giverName: "Adaeze",
      wishlistTitle: "Nomso's Christmas Wishlist",
      sharePath: "/nomso/w/christmas",
      createdAt: "2026-11-25T09:30:00.000Z",
    });
    // The query itself is scoped to the reference; no email is selected.
    expect(prisma.wishlist_contributions.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { paystack_reference: "ref_1" },
      }),
    );
  });

  it("masks anonymous givers exactly like the public page", async () => {
    (prisma.wishlist_contributions.findFirst as jest.Mock).mockResolvedValue(
      contributionRow({ is_anonymous: true, name: null }),
    );

    const result = await getWishlistGiftByReference("ref_1");

    expect(result.data!.giverName).toBe("Anonymous");
  });

  it("falls back to the wishlist landing when the owner has no username", async () => {
    (prisma.wishlist_contributions.findFirst as jest.Mock).mockResolvedValue(
      contributionRow({
        item: {
          name: "A new study desk",
          wishlist: {
            title: "Nomso's Christmas Wishlist",
            slug: "christmas",
            user: { username: null },
          },
        },
      }),
    );

    const result = await getWishlistGiftByReference("ref_1");

    expect(result.data!.sharePath).toBeNull();
  });

  it("fails closed for an unknown reference", async () => {
    (prisma.wishlist_contributions.findFirst as jest.Mock).mockResolvedValue(
      null,
    );

    const result = await getWishlistGiftByReference("ref_missing");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Gift not found");
  });
});
