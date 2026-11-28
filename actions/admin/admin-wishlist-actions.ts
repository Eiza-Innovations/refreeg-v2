"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/actions/users/auth-actions";
import { isAdminOrManager } from "@/actions/admin/role-actions";
import { logAdminActivity } from "@/actions/admin/database-actions";
import { wishlistSharePath } from "@/lib/wishlist/payout";
import { revalidatePath } from "next/cache";

export interface AdminWishlistRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  isPublic: boolean;
  ownerName: string;
  ownerUsername: string;
  ownerEmail: string;
  itemCount: number;
  giftsTotal: number;
  targetTotal: number;
  createdAt: string;
  sharePath: string;
}

export interface AdminWishlistQueue {
  rows: AdminWishlistRow[];
  counts: Record<string, number>;
}

/** Every wishlist, with its owner and gift totals, for the admin queue. */
export async function getAdminWishlistQueue(): Promise<AdminWishlistQueue> {
  const rows = await prisma.wishlists.findMany({
    include: {
      items: { select: { price: true, contributed: true, funded_at: true } },
      user: {
        select: { fullName: true, username: true, email: true },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const mapped: AdminWishlistRow[] = rows.map((w) => ({
    id: w.id,
    title: w.title,
    slug: w.slug,
    status: w.status,
    isPublic: w.is_public,
    ownerName: w.user.fullName || w.user.username || "Unknown",
    ownerUsername: w.user.username ?? "",
    ownerEmail: w.user.email ?? "",
    itemCount: w.items.length,
    giftsTotal: w.items.reduce((sum, i) => sum + Number(i.contributed), 0),
    targetTotal: w.items.reduce((sum, i) => sum + Number(i.price), 0),
    createdAt: w.created_at.toISOString(),
    sharePath: wishlistSharePath(w.user.username, w.slug) ?? "",
  }));

  return {
    rows: mapped,
    counts: {
      all: mapped.length,
      live: mapped.filter((w) => w.status === "active").length,
      archived: mapped.filter((w) => w.status === "archived").length,
      removed: mapped.filter((w) => w.status === "removed").length,
    },
  };
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!(await isAdminOrManager(user.id))) return null;
  return user;
}

/** Admin takedown / restore; "removed" also blocks new gifts. */
export async function setWishlistAdminStatus(
  wishlistId: string,
  status: "removed" | "active",
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Unauthorized" };

  try {
    const wishlist = await prisma.wishlists.findUnique({
      where: { id: wishlistId },
      select: {
        id: true,
        status: true,
        slug: true,
        user: { select: { username: true } },
      },
    });
    if (!wishlist) return { success: false, error: "Wishlist not found" };
    if (wishlist.status === status) {
      return { success: true };
    }

    await prisma.wishlists.update({
      where: { id: wishlistId },
      data: {
        status,
        ...(notes ? { admin_notes: notes } : {}),
      },
    });
    await logAdminActivity(
      status === "removed" ? "remove-wishlist" : "restore-wishlist",
      admin.id,
    );
    revalidatePath("/dashboard/admin/wishlists");
    const sharePath = wishlistSharePath(wishlist.user.username, wishlist.slug);
    if (sharePath) revalidatePath(sharePath);
    return { success: true };
  } catch (error) {
    console.error("Error updating wishlist status (admin):", error);
    return { success: false, error: "Could not update the wishlist" };
  }
}
