jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    wishlists: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

// The actions module imports the mail service at the top level; mock it so
// the aws-sdk ESM chain it drags in never loads in this sandbox.
jest.mock("@/services/mail", () => ({
  sendWishlistContributionEmail: jest.fn(),
  sendWishlistItemFundedEmail: jest.fn(),
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { createWishlist } from "@/actions/wishlists/wishlist-actions";

const readyOwner = {
  id: "owner-1",
  username: "nomso",
  isVerified: true,
  subAccountCode: "ACCT_paystack_1",
};

const ownerWithoutKyc = {
  id: "owner-1",
  username: "nomso",
  isVerified: false,
  subAccountCode: "ACCT_paystack_1",
};

const ownerWithoutBank = {
  id: "owner-1",
  username: "nomso",
  isVerified: true,
  subAccountCode: null,
};

const createdRow = {
  id: "w-1",
  user_id: "owner-1",
  title: "Nomso's Christmas Wishlist",
  slug: "nomsos-christmas-wishlist",
  message: null,
  status: "active",
  is_public: false,
  created_at: new Date("2026-11-01T10:00:00Z"),
  updated_at: new Date("2026-11-01T10:00:00Z"),
};

describe("createWishlist (payout gate and duplicate names)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: "owner-1" } });
  });

  it("refuses to create until identity verification is done", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerWithoutKyc);

    const result = await createWishlist({ title: "Christmas" });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Verify your identity in Settings before creating a wishlist",
    );
    expect(prisma.wishlists.create).not.toHaveBeenCalled();
  });

  it("refuses to create while no bank account is on file", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(ownerWithoutBank);

    const result = await createWishlist({ title: "Christmas" });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Add your bank account in Settings before creating a wishlist",
    );
    expect(prisma.wishlists.create).not.toHaveBeenCalled();
  });

  it("says a duplicate name is taken instead of minting a -2 link", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(readyOwner);
    (prisma.wishlists.findFirst as jest.Mock).mockResolvedValue({
      id: "w-existing",
    });

    const result = await createWishlist({ title: "Christmas" });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "You already have a wishlist with this name. Pick a different name.",
    );
    // The lookup ran against this owner's slugs only.
    expect(prisma.wishlists.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: "owner-1", slug: "christmas" },
      }),
    );
    expect(prisma.wishlists.create).not.toHaveBeenCalled();
  });

  it("creates with an apostrophe-stripped slug once payout is ready", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(readyOwner);
    (prisma.wishlists.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.wishlists.create as jest.Mock).mockResolvedValue(createdRow);

    const result = await createWishlist({
      title: "Nomso's Christmas Wishlist",
    });

    expect(result.success).toBe(true);
    expect(result.data!.slug).toBe("nomsos-christmas-wishlist");
    expect(prisma.wishlists.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user_id: "owner-1",
          slug: "nomsos-christmas-wishlist",
        }),
      }),
    );
  });
});
