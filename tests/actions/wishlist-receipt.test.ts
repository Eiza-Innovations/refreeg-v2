jest.mock("@/lib/prisma", () => ({
  prisma: {
    wishlist_contributions: {
      findFirst: jest.fn(),
    },
    wishlist_items: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

// The actions module imports the mail service at the top level; mock it so
// the aws-sdk ESM chain it drags in never loads in this sandbox.
jest.mock("@/services/mail", () => ({
  sendWishlistContributionEmail: jest.fn().mockResolvedValue(undefined),
  sendWishlistGiftReceiptEmail: jest.fn().mockResolvedValue(undefined),
  sendWishlistItemFundedEmail: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import {
  sendWishlistContributionEmail,
  sendWishlistGiftReceiptEmail,
  sendWishlistItemFundedEmail,
} from "@/services/mail";
import { recordWishlistContribution } from "@/actions/wishlists/wishlist-actions";

const contributionRow = {
  id: "c-1",
  item_id: "i-1",
  user_id: null,
  paystack_reference: "PSK_abc123",
  payment_provider: "paystack",
  amount: 2500,
  name: "Adaeze",
  email: "adaeze@example.com",
  message: null,
  is_anonymous: false,
  status: "completed",
  created_at: new Date("2026-11-26T10:00:00Z"),
  updated_at: new Date("2026-11-26T10:00:00Z"),
};

const itemWithWishlist = {
  name: "A new study desk",
  price: 80000,
  wishlist: {
    title: "Nomso's Christmas Wishlist",
    slug: "nomsos-christmas-wishlist",
    user: {
      fullName: "Nomso Obi",
      email: "nomso@example.com",
      username: "nomso",
    },
  },
};

const namedGiver = {
  amount: 2500,
  name: "Adaeze",
  email: "adaeze@example.com",
  message: "Merry Christmas!",
  isAnonymous: false,
};

const mockSuccessPath = () => {
  (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue(
    itemWithWishlist,
  );
  (prisma.$transaction as jest.Mock).mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        wishlist_contributions: {
          create: jest.fn().mockResolvedValue(contributionRow),
        },
        wishlist_items: {
          update: jest.fn().mockResolvedValue({}),
          findUnique: jest.fn().mockResolvedValue({
            price: 80000,
            contributed: 52500,
            funded_at: null,
          }),
        },
      };
      return fn(tx);
    },
  );
};

describe("recordWishlistContribution (giver receipt)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sendWishlistContributionEmail as jest.Mock).mockResolvedValue(undefined);
    (sendWishlistGiftReceiptEmail as jest.Mock).mockResolvedValue(undefined);
    (sendWishlistItemFundedEmail as jest.Mock).mockResolvedValue(undefined);
  });

  it("sends the giver a receipt of their own gift once the charge lands", async () => {
    mockSuccessPath();
    (prisma.wishlist_contributions.findFirst as jest.Mock).mockResolvedValue(
      null,
    );

    await recordWishlistContribution("i-1", null, namedGiver, "PSK_abc123");

    expect(sendWishlistGiftReceiptEmail).toHaveBeenCalledTimes(1);
    expect(sendWishlistGiftReceiptEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "adaeze@example.com",
        giverName: "Adaeze",
        itemName: "A new study desk",
        wishlistTitle: "Nomso's Christmas Wishlist",
        amount: 2500,
        reference: "PSK_abc123",
        isAnonymous: false,
      }),
    );
    // The owner alert still fires alongside it.
    expect(sendWishlistContributionEmail).toHaveBeenCalledTimes(1);
  });

  it("still receipts an anonymous giver while masking their name to the owner", async () => {
    mockSuccessPath();
    (prisma.wishlist_contributions.findFirst as jest.Mock).mockResolvedValue(
      null,
    );

    await recordWishlistContribution("i-1", null, {
      ...namedGiver,
      name: undefined,
      message: undefined,
      isAnonymous: true,
    });

    expect(sendWishlistGiftReceiptEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "adaeze@example.com",
        isAnonymous: true,
      }),
    );
    expect(sendWishlistContributionEmail).toHaveBeenCalledWith(
      expect.objectContaining({ giverName: "An anonymous giver" }),
    );
  });

  it("never sends a second receipt when a replayed reference returns", async () => {
    (prisma.wishlist_contributions.findFirst as jest.Mock).mockResolvedValue(
      contributionRow,
    );

    const result = await recordWishlistContribution(
      "i-1",
      null,
      namedGiver,
      "PSK_abc123",
    );

    expect(result.id).toBe("c-1");
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(sendWishlistGiftReceiptEmail).not.toHaveBeenCalled();
    expect(sendWishlistContributionEmail).not.toHaveBeenCalled();
  });

  it("skips the receipt when the giver left no email but still tells the owner", async () => {
    mockSuccessPath();
    (prisma.wishlist_contributions.findFirst as jest.Mock).mockResolvedValue(
      null,
    );

    await recordWishlistContribution("i-1", null, {
      ...namedGiver,
      email: "",
    });

    expect(sendWishlistGiftReceiptEmail).not.toHaveBeenCalled();
    expect(sendWishlistContributionEmail).toHaveBeenCalledTimes(1);
    expect(sendWishlistContributionEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "nomso@example.com" }),
    );
  });

  it("receipts the giver even when the owner has no email on file", async () => {
    (prisma.wishlist_items.findUnique as jest.Mock).mockResolvedValue({
      ...itemWithWishlist,
      wishlist: {
        ...itemWithWishlist.wishlist,
        user: { fullName: "Nomso Obi", email: null, username: "nomso" },
      },
    });
    (prisma.wishlist_contributions.findFirst as jest.Mock).mockResolvedValue(
      null,
    );
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          wishlist_contributions: {
            create: jest.fn().mockResolvedValue(contributionRow),
          },
          wishlist_items: {
            update: jest.fn().mockResolvedValue({}),
            findUnique: jest.fn().mockResolvedValue({
              price: 80000,
              contributed: 52500,
              funded_at: null,
            }),
          },
        };
        return fn(tx);
      },
    );

    await recordWishlistContribution("i-1", null, namedGiver, "PSK_abc123");

    expect(sendWishlistGiftReceiptEmail).toHaveBeenCalledTimes(1);
    expect(sendWishlistContributionEmail).not.toHaveBeenCalled();
    expect(sendWishlistItemFundedEmail).not.toHaveBeenCalled();
  });
});
