/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    wishlists: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    wishlist_items: {
      count: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    wishlist_contributions: {
      count: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    // Saved-wishlist bookmarks are polymorphic rows with no FK; the delete
    // action sweeps them so /saved never points at a deleted wishlist.
    bookmark: {
      deleteMany: jest.fn(),
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

    // Support both $transaction([...]) and $transaction(async (tx) => ...).
    db.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (tx: typeof db) => unknown)(db);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });

    db.wishlists.update.mockResolvedValue({ ...ownedRow, status: "deleted" });
    db.wishlists.delete.mockResolvedValue({ id: "w-1" });
    db.wishlist_items.count.mockResolvedValue(0);
    db.wishlist_items.findMany.mockResolvedValue([]);
    db.wishlist_items.deleteMany.mockResolvedValue({ count: 0 });
    db.wishlist_items.updateMany.mockResolvedValue({ count: 0 });
    db.wishlist_contributions.count.mockResolvedValue(0);
    db.wishlist_contributions.findMany.mockResolvedValue([]);
    db.wishlist_contributions.aggregate.mockResolvedValue({
      _sum: { amount: 0 },
    });
    db.bookmark.deleteMany.mockResolvedValue({ count: 0 });
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
    db.wishlist_contributions.aggregate.mockResolvedValue({
      _sum: { amount: 10_000 },
    });

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
    expect(db.bookmark.deleteMany).toHaveBeenCalledWith({
      where: { target_type: "wishlist", target_id: "w-1" },
    });
    expect(db.wishlists.delete).toHaveBeenCalledWith({ where: { id: "w-1" } });
  });
});
