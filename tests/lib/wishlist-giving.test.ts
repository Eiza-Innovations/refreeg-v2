jest.mock("@/lib/prisma", () => ({
  prisma: {
    wishlist_items: {
      findUnique: jest.fn(),
    },
    wishlist_contributions: {
      aggregate: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  assertWishlistAcceptingGifts,
  WishlistOwnerSnapshot,
} from "@/lib/wishlist/giving";
import { WISHLIST_KYC_THRESHOLD_NAIRA } from "@/lib/schemas/wishlist.schema";

const verifiedOwner: WishlistOwnerSnapshot = {
  id: "owner-1",
  fullName: "Nomso Okeke",
  username: "nomso",
  email: "nomso@example.com",
  subAccountCode: "ACCT_paystack_1",
  flutterwaveSubAccountId: null,
  accountNumber: "1234567890",
  bankName: "Access Bank",
};

const unverifiedOwner = { ...verifiedOwner, subAccountCode: null };

function itemRow(overrides: Record<string, unknown> = {}) {
  return {
    price: 80000,
    contributed: 52400,
    funded_at: null,
    wishlist: { status: "active", user: verifiedOwner },
    ...overrides,
  };
}

describe("assertWishlistAcceptingGifts (checkout guards)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuses an item that no longer exists", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(assertWishlistAcceptingGifts("item-9", 2500)).rejects.toThrow(
      "no longer listed",
    );
  });

  it("refuses an archived wishlist", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow({ wishlist: { status: "archived", user: verifiedOwner } }),
    );

    await expect(assertWishlistAcceptingGifts("item-9", 2500)).rejects.toThrow(
      "archived",
    );
  });

  it("refuses a funded item, whether stamped or just at goal", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow({ funded_at: new Date() }),
    );
    await expect(assertWishlistAcceptingGifts("item-9", 2500)).rejects.toThrow(
      "fully funded",
    );

    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow({ contributed: 80000 }),
    );
    await expect(assertWishlistAcceptingGifts("item-9", 2500)).rejects.toThrow(
      "fully funded",
    );
  });

  it("hard-refuses a gift that would overshoot the item's goal", async () => {
    // 80000 - 52400 = 27600 remaining; 30000 overshoots.
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow(),
    );

    await expect(assertWishlistAcceptingGifts("item-9", 30000)).rejects.toThrow(
      "only needs ₦27,600 more",
    );
  });

  it("lets a gift land exactly on the remaining balance and returns the owner", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow(),
    );

    const result = await assertWishlistAcceptingGifts("item-9", 27600);

    expect(result.owner.id).toBe("owner-1");
    expect(result.owner.subAccountCode).toBe("ACCT_paystack_1");
    // A verified owner never needs the unverified-collection aggregate.
    expect(prisma.wishlist_contributions.aggregate).not.toHaveBeenCalled();
  });

  it("caps an unverified owner's collections at the KYC threshold", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow({ wishlist: { status: "active", user: unverifiedOwner } }),
    );
    (prisma.wishlist_contributions.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: WISHLIST_KYC_THRESHOLD_NAIRA - 2000 },
    });

    // 498,000 collected + 3,000 gift crosses the ₦500k ceiling.
    await expect(assertWishlistAcceptingGifts("item-9", 3000)).rejects.toThrow(
      "₦500,000 collection cap",
    );
  });

  it("lets the gift that stops exactly at the ceiling through", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow({ wishlist: { status: "active", user: unverifiedOwner } }),
    );
    (prisma.wishlist_contributions.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: WISHLIST_KYC_THRESHOLD_NAIRA - 5000 },
    });

    const result = await assertWishlistAcceptingGifts("item-9", 5000);

    expect(result.owner.subAccountCode).toBeNull();
  });

  it("scopes the unverified aggregate to the owner's whole wishlist tree", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
      itemRow({ wishlist: { status: "active", user: unverifiedOwner } }),
    );
    (prisma.wishlist_contributions.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: 0 },
    });

    await assertWishlistAcceptingGifts("item-9", 2500);

    expect(prisma.wishlist_contributions.aggregate).toHaveBeenCalledWith({
      _sum: { amount: true },
      where: { item: { wishlist: { user_id: "owner-1" } } },
    });
  });
});
