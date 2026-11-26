jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    wishlists: {
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

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { getWishlistByUsernameAndSlug } from "@/actions/wishlists/wishlist-actions";

const owner = {
  id: "owner-1",
  username: "nomso",
  subAccountCode: "ACCT_paystack_1",
};

const unverifiedOwner = {
  id: "owner-1",
  username: "nomso",
  subAccountCode: null,
};

const wishlistRow = {
  id: "w-1",
  user_id: "owner-1",
  title: "Nomso's Christmas Wishlist",
  slug: "christmas",
  message: null,
  status: "active",
  is_public: false,
  created_at: new Date("2026-11-01T10:00:00Z"),
  updated_at: new Date("2026-11-01T10:00:00Z"),
  items: [
    {
      id: "item-9",
      wishlist_id: "w-1",
      name: "A new study desk",
      price: 80000,
      contributed: 52400,
      note: null,
      sort_order: 0,
      funded_at: null,
      created_at: new Date("2026-11-01T10:00:00Z"),
      updated_at: new Date("2026-11-01T10:00:00Z"),
    },
  ],
};

describe("getWishlistByUsernameAndSlug (public share lookup)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fails closed for an unknown username without touching the wishlist table", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await getWishlistByUsernameAndSlug("ghost", "christmas");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Wishlist not found");
    expect(prisma.wishlists.findFirst).not.toHaveBeenCalled();
  });

  it("returns not found when the slug belongs to nobody on that account", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(owner);
    (prisma.wishlists.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await getWishlistByUsernameAndSlug("nomso", "christmas");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Wishlist not found");
    // Scoped to the resolved owner, so another user's slug cannot leak in.
    expect(prisma.wishlists.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: "owner-1", slug: "christmas" },
      }),
    );
  });

  it("returns the wishlist with its owner's username for visitors", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(owner);
    (prisma.wishlists.findFirst as jest.Mock).mockResolvedValue(wishlistRow);
    (auth as jest.Mock).mockResolvedValue(null);

    const result = await getWishlistByUsernameAndSlug("nomso", "christmas");

    expect(result.success).toBe(true);
    expect(result.data!.ownerUsername).toBe("nomso");
    expect(result.data!.viewerIsOwner).toBe(false);
    // Payout readiness is a boolean only — never the details themselves.
    expect(result.data!.ownerPayoutReady).toBe(true);
    expect(result.data!.wishlist.items[0].price).toBe(80000);
    expect(typeof result.data!.wishlist.created_at).toBe("string");
  });

  it("reports an owner without bank details as not payout-ready", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(unverifiedOwner);
    (prisma.wishlists.findFirst as jest.Mock).mockResolvedValue(wishlistRow);
    (auth as jest.Mock).mockResolvedValue(null);

    const result = await getWishlistByUsernameAndSlug("nomso", "christmas");

    expect(result.data!.ownerPayoutReady).toBe(false);
  });

  it("flags the owner session so the page can render owner state", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(owner);
    (prisma.wishlists.findFirst as jest.Mock).mockResolvedValue(wishlistRow);
    (auth as jest.Mock).mockResolvedValue({ user: { id: "owner-1" } });

    const result = await getWishlistByUsernameAndSlug("nomso", "christmas");

    expect(result.data!.viewerIsOwner).toBe(true);
  });
});
