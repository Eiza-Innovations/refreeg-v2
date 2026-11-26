/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    wishlists: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    wishlist_items: {
      deleteMany: jest.fn(),
    },
    wishlist_contributions: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { deleteWishlist } from "@/actions/wishlists/wishlist-actions";

const db = prisma as any;

const ownedRow = {
  id: "w-1",
  user_id: "owner-1",
  slug: "nomsos-wishlist",
  title: "Nomso's Wishlist",
  status: "active",
  user: { username: "nomso" },
};

describe("deleteWishlist (owner-only, money-trail safe)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.$transaction.mockImplementation((ops: unknown[]) =>
      Promise.resolve(ops),
    );
  });

  it("fails closed when unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const result = await deleteWishlist("w-1");

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(db.wishlists.delete).not.toHaveBeenCalled();
  });

  it("fails closed for a non-owner session", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "attacker-1" } });
    db.wishlists.findUnique.mockResolvedValue(ownedRow);

    const result = await deleteWishlist("w-1");

    expect(result).toEqual({ success: false, error: "Wishlist not found" });
    expect(db.wishlists.delete).not.toHaveBeenCalled();
  });

  it("refuses a wishlist that already has gifts and keeps the trail", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "owner-1" } });
    db.wishlists.findUnique.mockResolvedValue(ownedRow);
    db.wishlist_contributions.count.mockResolvedValue(2);

    const result = await deleteWishlist("w-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Archive it instead");
    expect(db.wishlists.delete).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("deletes an untouched wishlist with its items in one transaction", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "owner-1" } });
    db.wishlists.findUnique.mockResolvedValue(ownedRow);
    db.wishlist_contributions.count.mockResolvedValue(0);

    const result = await deleteWishlist("w-1");

    expect(result).toEqual({ success: true });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.wishlist_items.deleteMany).toHaveBeenCalledWith({
      where: { wishlist_id: "w-1" },
    });
    expect(db.wishlists.delete).toHaveBeenCalledWith({ where: { id: "w-1" } });
  });
});
