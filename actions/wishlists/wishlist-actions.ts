"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import {
  wishlistCreateSchema,
  wishlistUpdateSchema,
  wishlistItemSchema,
  WISHLIST_ITEM_CAP,
} from "@/lib/schemas/wishlist.schema";
import { slugifyWishlistTitle } from "@/lib/wishlist/slug";
import { wishlistGiftDonorFilter } from "@/lib/wishlist/giving";
import {
  revalidateSharePath,
  resolveOwnerPayoutState,
  wishlistSharePath,
} from "@/lib/wishlist/payout";
import {
  mapPrismaToWishlist,
  mapPrismaToWishlistContribution,
  mapPrismaToWishlistItem,
  toIso,
} from "@/lib/wishlist/mappers";
import {
  sendWishlistContributionEmail,
  sendWishlistGiftReceiptEmail,
  sendWishlistItemFundedEmail,
} from "@/services/mail";
import type {
  Wishlist,
  WishlistItem,
  WishlistContributor,
  WishlistContribution,
  WishlistContributionData,
  WishlistGiftSummary,
  WishlistOwnerPayoutState,
  WishlistWithItems,
  PaymentProviderType,
} from "@/types";

function isSlugTakenForUser(userId: string, slug: string) {
  return prisma.wishlists
    .findFirst({ where: { user_id: userId, slug }, select: { id: true } })
    .then((row) => row !== null);
}

async function requireOwnedWishlist(wishlistId: string, userId: string) {
  const wishlist = await prisma.wishlists.findUnique({
    where: { id: wishlistId },
    select: {
      id: true,
      user_id: true,
      status: true,
      slug: true,
      title: true,
      user: { select: { username: true } },
    },
  });
  if (!wishlist || wishlist.user_id !== userId) return null;
  return wishlist;
}

export async function createWishlist(input: {
  title: string;
  message?: string;
  isPublic?: boolean;
}): Promise<{ success: boolean; error?: string; data?: Wishlist }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  const parsed = wishlistCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const owner = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, isVerified: true, subAccountCode: true },
    });
    if (!owner?.username) {
      return {
        success: false,
        error: "Set your username before creating a wishlist",
      };
    }

    const payoutState = resolveOwnerPayoutState(owner);
    if (payoutState !== "ready") {
      return {
        success: false,
        error:
          payoutState === "kyc_pending"
            ? "Verify your identity in Settings before creating a wishlist"
            : "Add your bank account in Settings before creating a wishlist",
      };
    }

    const slug = slugifyWishlistTitle(parsed.data.title);
    if (await isSlugTakenForUser(session.user.id, slug)) {
      return {
        success: false,
        error:
          "You already have a wishlist with this name. Pick a different name.",
      };
    }
    const wishlist = await prisma.wishlists.create({
      data: {
        user_id: session.user.id,
        title: parsed.data.title,
        slug,
        message: parsed.data.message || null,
        // Public by default so new wishlists can be discovered; the owner
        // can flip it to private at creation or any time after.
        is_public: parsed.data.isPublic ?? true,
      },
    });
    return { success: true, data: mapPrismaToWishlist(wishlist) };
  } catch (error) {
    console.error("Error creating wishlist:", error);
    return { success: false, error: "Could not save the wishlist" };
  }
}

export async function updateWishlist(
  wishlistId: string,
  input: { title?: string; message?: string; isPublic?: boolean },
): Promise<{ success: boolean; error?: string; data?: Wishlist }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  const parsed = wishlistUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const wishlist = await requireOwnedWishlist(wishlistId, session.user.id);
    if (!wishlist) return { success: false, error: "Wishlist not found" };

    const updated = await prisma.wishlists.update({
      where: { id: wishlistId },
      data: {
        ...(parsed.data.title !== undefined
          ? { title: parsed.data.title }
          : {}),
        ...(parsed.data.message !== undefined
          ? { message: parsed.data.message || null }
          : {}),
        ...(parsed.data.isPublic !== undefined
          ? { is_public: parsed.data.isPublic }
          : {}),
      },
    });
    revalidateSharePath(wishlist.user.username, updated.slug);
    return { success: true, data: mapPrismaToWishlist(updated) };
  } catch (error) {
    console.error("Error updating wishlist:", error);
    return { success: false, error: "Could not update the wishlist" };
  }
}

export async function setWishlistStatus(
  wishlistId: string,
  status: "active" | "archived",
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  try {
    const wishlist = await requireOwnedWishlist(wishlistId, session.user.id);
    if (!wishlist) return { success: false, error: "Wishlist not found" };

    await prisma.wishlists.update({
      where: { id: wishlistId },
      data: { status },
    });
    revalidateSharePath(wishlist.user.username, wishlist.slug);
    return { success: true };
  } catch (error) {
    console.error("Error updating wishlist status:", error);
    return { success: false, error: "Could not update the wishlist" };
  }
}

export async function deleteWishlist(
  wishlistId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  try {
    const wishlist = await requireOwnedWishlist(wishlistId, session.user.id);
    if (!wishlist) return { success: false, error: "Wishlist not found" };

    const gifts = await prisma.wishlist_contributions.count({
      where: { item: { wishlist_id: wishlistId } },
    });
    if (gifts > 0) {
      return {
        success: false,
        error:
          "This wishlist already has gifts on it, so its record stays. Archive it instead.",
      };
    }

    await prisma.$transaction([
      prisma.wishlist_items.deleteMany({ where: { wishlist_id: wishlistId } }),
      // Saved-wishlist bookmarks are polymorphic rows with no FK; sweep them
      // so /saved never keeps a pointer at a deleted wishlist.
      prisma.bookmark.deleteMany({
        where: { target_type: "wishlist", target_id: wishlistId },
      }),
      prisma.wishlists.delete({ where: { id: wishlistId } }),
    ]);
    revalidateSharePath(wishlist.user.username, wishlist.slug);
    return { success: true };
  } catch (error) {
    console.error("Error deleting wishlist:", error);
    return { success: false, error: "Could not delete the wishlist" };
  }
}

type ItemActionResult = {
  success: boolean;
  error?: string;
  data?: WishlistItem;
};

async function requireOwnedItem(itemId: string, userId: string) {
  const item = await prisma.wishlist_items.findUnique({
    where: { id: itemId },
    include: {
      wishlist: {
        select: {
          user_id: true,
          slug: true,
          user: { select: { username: true } },
        },
      },
      _count: { select: { contributions: true } },
    },
  });
  if (!item || item.wishlist.user_id !== userId) return null;
  return item;
}

export async function addWishlistItem(
  wishlistId: string,
  input: {
    name: string;
    price: number;
    note?: string;
    imageUrl?: string | null;
  },
): Promise<ItemActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  const parsed = wishlistItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const wishlist = await prisma.wishlists.findUnique({
      where: { id: wishlistId },
      select: {
        id: true,
        slug: true,
        user_id: true,
        user: { select: { username: true } },
      },
    });
    if (!wishlist || wishlist.user_id !== session.user.id) {
      return { success: false, error: "Wishlist not found" };
    }

    const existing = await prisma.wishlist_items.findMany({
      where: { wishlist_id: wishlistId },
      select: { id: true, sort_order: true },
    });
    if (existing.length >= WISHLIST_ITEM_CAP) {
      return {
        success: false,
        error: `A wishlist holds up to ${WISHLIST_ITEM_CAP} items`,
      };
    }

    const nextOrder =
      existing.reduce((max, item) => Math.max(max, item.sort_order), -1) + 1;
    const item = await prisma.wishlist_items.create({
      data: {
        wishlist_id: wishlistId,
        name: parsed.data.name,
        price: parsed.data.price,
        note: parsed.data.note || null,
        image_url: parsed.data.imageUrl || null,
        sort_order: nextOrder,
      },
    });
    revalidateSharePath(wishlist.user.username, wishlist.slug);
    return { success: true, data: mapPrismaToWishlistItem(item) };
  } catch (error) {
    console.error("Error adding wishlist item:", error);
    return { success: false, error: "Could not add the item" };
  }
}

export async function updateWishlistItem(
  itemId: string,
  input: {
    name?: string;
    price?: number;
    note?: string;
    imageUrl?: string | null;
    sort_order?: number;
  },
): Promise<ItemActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  const parsed = wishlistItemSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const item = await requireOwnedItem(itemId, session.user.id);
    if (!item) return { success: false, error: "Item not found" };

    if (
      parsed.data.price !== undefined &&
      item._count.contributions > 0 &&
      Number(item.price) !== parsed.data.price
    ) {
      return {
        success: false,
        error: "This item has contributions, so its price is locked",
      };
    }

    const updated = await prisma.wishlist_items.update({
      where: { id: itemId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.price !== undefined
          ? { price: parsed.data.price }
          : {}),
        ...(parsed.data.note !== undefined
          ? { note: parsed.data.note || null }
          : {}),
        ...(parsed.data.imageUrl !== undefined
          ? { image_url: parsed.data.imageUrl || null }
          : {}),
        ...(parsed.data.sort_order !== undefined
          ? { sort_order: parsed.data.sort_order }
          : {}),
      },
    });
    revalidateSharePath(item.wishlist.user.username, item.wishlist.slug);
    return { success: true, data: mapPrismaToWishlistItem(updated) };
  } catch (error) {
    console.error("Error updating wishlist item:", error);
    return { success: false, error: "Could not update the item" };
  }
}

export async function deleteWishlistItem(
  itemId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  try {
    const item = await requireOwnedItem(itemId, session.user.id);
    if (!item) return { success: false, error: "Item not found" };

    if (item._count.contributions > 0) {
      return {
        success: false,
        error: "Items with contributions cannot be deleted",
      };
    }

    await prisma.wishlist_items.delete({ where: { id: itemId } });
    revalidateSharePath(item.wishlist.user.username, item.wishlist.slug);
    return { success: true };
  } catch (error) {
    console.error("Error deleting wishlist item:", error);
    return { success: false, error: "Could not delete the item" };
  }
}

export async function reorderWishlistItems(
  wishlistId: string,
  orderedItemIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  try {
    const wishlist = await prisma.wishlists.findUnique({
      where: { id: wishlistId },
      select: {
        id: true,
        slug: true,
        user_id: true,
        user: { select: { username: true } },
      },
    });
    if (!wishlist || wishlist.user_id !== session.user.id) {
      return { success: false, error: "Wishlist not found" };
    }

    const items = await prisma.wishlist_items.findMany({
      where: { wishlist_id: wishlistId },
      select: { id: true },
    });
    const known = new Set(items.map((item) => item.id));
    const matches =
      orderedItemIds.length === items.length &&
      orderedItemIds.every((id) => known.has(id));
    if (!matches) {
      return {
        success: false,
        error: "Item order does not match the wishlist",
      };
    }

    await prisma.$transaction(
      orderedItemIds.map((id, index) =>
        prisma.wishlist_items.update({
          where: { id },
          data: { sort_order: index },
        }),
      ),
    );
    revalidateSharePath(wishlist.user.username, wishlist.slug);
    return { success: true };
  } catch (error) {
    console.error("Error reordering wishlist items:", error);
    return { success: false, error: "Could not reorder the items" };
  }
}

export async function getWishlistByUsernameAndSlug(
  username: string,
  slug: string,
): Promise<{
  success: boolean;
  error?: string;
  data?: {
    wishlist: WishlistWithItems;
    ownerUsername: string;
    viewerIsOwner: boolean;
    ownerPayoutReady: boolean;
    ownerPayoutState: WishlistOwnerPayoutState;
  };
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        isVerified: true,
        subAccountCode: true,
      },
    });
    if (!user) return { success: false, error: "Wishlist not found" };

    const wishlist = await prisma.wishlists.findFirst({
      where: { user_id: user.id, slug },
      include: {
        items: { orderBy: { sort_order: "asc" } },
      },
    });
    if (!wishlist) return { success: false, error: "Wishlist not found" };

    const session = await auth();
    const ownerPayoutState = resolveOwnerPayoutState(user);
    return {
      success: true,
      data: {
        wishlist: {
          ...mapPrismaToWishlist(wishlist),
          items: wishlist.items.map(mapPrismaToWishlistItem),
        },
        ownerUsername: username,
        viewerIsOwner: session?.user?.id === wishlist.user_id,
        ownerPayoutReady: ownerPayoutState === "ready",
        ownerPayoutState,
      },
    };
  } catch (error) {
    console.error("Error loading wishlist:", error);
    return { success: false, error: "Could not load the wishlist" };
  }
}

export async function getWishlistCreationReadiness(): Promise<{
  signedIn: boolean;
  username: string | null;
  payoutState: WishlistOwnerPayoutState;
  kycVerified: boolean;
  bankAdded: boolean;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      signedIn: false,
      username: null,
      payoutState: "kyc_pending",
      kycVerified: false,
      bankAdded: false,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, isVerified: true, subAccountCode: true },
  });
  if (!user) {
    return {
      signedIn: false,
      username: null,
      payoutState: "kyc_pending",
      kycVerified: false,
      bankAdded: false,
    };
  }

  return {
    signedIn: true,
    username: user.username,
    payoutState: resolveOwnerPayoutState(user),
    kycVerified: Boolean(user.isVerified),
    bankAdded: Boolean(user.subAccountCode),
  };
}

export async function listUserWishlists(): Promise<{
  success: boolean;
  error?: string;
  data?: { username: string | null; wishlists: WishlistWithItems[] };
}> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  try {
    const [owner, wishlists] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { username: true },
      }),
      prisma.wishlists.findMany({
        where: { user_id: session.user.id },
        include: { items: { orderBy: { sort_order: "asc" } } },
        orderBy: { created_at: "desc" },
      }),
    ]);
    return {
      success: true,
      data: {
        username: owner?.username ?? null,
        wishlists: wishlists.map((w) => ({
          ...mapPrismaToWishlist(w),
          items: w.items.map(mapPrismaToWishlistItem),
        })),
      },
    };
  } catch (error) {
    console.error("Error listing wishlists:", error);
    return { success: false, error: "Could not load your wishlists" };
  }
}

export async function listPublicWishlistsByUsername(username: string): Promise<{
  success: boolean;
  error?: string;
  data?: import("@/types").PublicWishlistSummary[];
}> {
  try {
    const owner = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!owner) return { success: true, data: [] };

    // The owner sees all of their wishlists on their own profile; everyone
    // else only sees the ones marked public.
    const viewer = await auth();
    const viewerIsOwner = viewer?.user?.id === owner.id;

    const wishlists = await prisma.wishlists.findMany({
      where: {
        user_id: owner.id,
        status: "active",
        ...(viewerIsOwner ? {} : { is_public: true }),
      },
      include: { items: { orderBy: { sort_order: "asc" } } },
      orderBy: { created_at: "desc" },
    });

    return {
      success: true,
      data: wishlists.map((w) => ({
        id: w.id,
        title: w.title,
        slug: w.slug,
        created_at: toIso(w.created_at),
        item_count: w.items.length,
        funded_count: w.items.filter((i) => i.funded_at).length,
        contributed_total: w.items.reduce(
          (sum, i) => sum + Number(i.contributed),
          0,
        ),
        target_total: w.items.reduce((sum, i) => sum + Number(i.price), 0),
        preview_images: w.items
          .filter((i) => i.image_url)
          .slice(0, 3)
          .map((i) => i.image_url as string),
      })),
    };
  } catch (error) {
    console.error("Error listing public wishlists:", error);
    return { success: false, error: "Could not load wishlists" };
  }
}

/**
 * Public wishlists for the /wishlist landing carousel. Only active, public
 * wishlists with at least one item are discoverable here; private ones stay
 * reachable through their link only.
 */
export async function listDiscoverableWishlists(limit = 12): Promise<{
  success: boolean;
  error?: string;
  data?: import("@/types").DiscoverableWishlist[];
}> {
  try {
    const rows = await prisma.wishlists.findMany({
      where: {
        status: "active",
        is_public: true,
        items: { some: {} },
        user: { username: { not: null } },
      },
      include: {
        items: { orderBy: { sort_order: "asc" } },
        user: { select: { username: true, fullName: true } },
      },
      orderBy: { created_at: "desc" },
      take: Math.min(Math.max(limit, 1), 24),
    });

    return {
      success: true,
      data: rows.flatMap((w) => {
        const ownerUsername = w.user.username;
        if (!ownerUsername) return [];
        return [
          {
            id: w.id,
            title: w.title,
            slug: w.slug,
            ownerUsername,
            ownerName: w.user.fullName,
            created_at: toIso(w.created_at),
            item_count: w.items.length,
            funded_count: w.items.filter((i) => i.funded_at).length,
            contributed_total: w.items.reduce(
              (sum, i) => sum + Number(i.contributed),
              0,
            ),
            target_total: w.items.reduce((sum, i) => sum + Number(i.price), 0),
            preview_images: w.items
              .filter((i) => i.image_url)
              .slice(0, 3)
              .map((i) => i.image_url as string),
          },
        ];
      }),
    };
  } catch (error) {
    console.error("Error listing discoverable wishlists:", error);
    return { success: false, error: "Could not load wishlists" };
  }
}

/**
 * The public givers list for a wishlist. Anyone who can open the wishlist
 * can see who gave — anonymous givers keep the "Anonymous" name and never
 * expose their email (it is never selected here).
 */
export async function getWishlistGivers(wishlistId: string): Promise<{
  success: boolean;
  error?: string;
  data?: import("@/types").WishlistContributor[];
}> {
  try {
    const wishlist = await prisma.wishlists.findUnique({
      where: { id: wishlistId },
      select: { id: true },
    });
    if (!wishlist) return { success: false, error: "Wishlist not found" };

    const rows = await prisma.wishlist_contributions.findMany({
      where: { item: { wishlist_id: wishlistId }, status: "completed" },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        amount: true,
        name: true,
        message: true,
        is_anonymous: true,
        created_at: true,
        item: { select: { name: true } },
      },
    });

    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        itemName: row.item.name,
        amount: Number(row.amount),
        name: row.name,
        message: row.message,
        isAnonymous: row.is_anonymous,
        createdAt: toIso(row.created_at),
      })),
    };
  } catch (error) {
    console.error("Error listing wishlist givers:", error);
    return { success: false, error: "Could not load the givers" };
  }
}

export async function listWishlistGiftsByUsername(
  username: string,
): Promise<import("@/types").WishlistGiftEntry[]> {
  try {
    const owner = await prisma.user.findUnique({
      where: { username },
      select: { id: true, email: true },
    });
    if (!owner) return [];

    const rows = await prisma.wishlist_contributions.findMany({
      where: wishlistGiftDonorFilter(owner.id, owner.email),
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        amount: true,
        name: true,
        is_anonymous: true,
        created_at: true,
        item: {
          select: {
            name: true,
            wishlist: {
              select: {
                title: true,
                slug: true,
                user: { select: { username: true } },
              },
            },
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      itemName: row.item.name,
      wishlistTitle: row.item.wishlist.title,
      wishlistPath: wishlistSharePath(
        row.item.wishlist.user.username,
        row.item.wishlist.slug,
      ),
      amount: Number(row.amount),
      giverName: row.name,
      isAnonymous: row.is_anonymous,
      createdAt: toIso(row.created_at),
    }));
  } catch (error) {
    console.error("Error listing wishlist gifts:", error);
    return [];
  }
}

export async function getWishlistContributors(wishlistId: string): Promise<{
  success: boolean;
  error?: string;
  data?: WishlistContributor[];
}> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  try {
    const wishlist = await requireOwnedWishlist(wishlistId, session.user.id);
    if (!wishlist) return { success: false, error: "Wishlist not found" };

    const rows = await prisma.wishlist_contributions.findMany({
      where: { item: { wishlist_id: wishlistId } },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        amount: true,
        name: true,
        message: true,
        is_anonymous: true,
        created_at: true,
        item: { select: { name: true } },
      },
    });

    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        itemName: row.item.name,
        amount: Number(row.amount),
        name: row.name,
        message: row.message,
        isAnonymous: row.is_anonymous,
        createdAt: toIso(row.created_at),
      })),
    };
  } catch (error) {
    console.error("Error loading wishlist contributors:", error);
    return { success: false, error: "Could not load the contributors" };
  }
}

export async function recordWishlistContribution(
  itemId: string,
  userId: string | null,
  data: WishlistContributionData,
  paystackReference?: string | null,
  paymentProvider: PaymentProviderType = "paystack",
): Promise<WishlistContribution> {
  const amount = Number(data.amount);

  if (paystackReference) {
    const existing = await prisma.wishlist_contributions.findFirst({
      where: { paystack_reference: paystackReference },
    });
    if (existing) return mapPrismaToWishlistContribution(existing);
  }

  const result = await prisma.$transaction(async (tx) => {
    const contribution = await tx.wishlist_contributions.create({
      data: {
        item_id: itemId,
        ...(userId ? { user_id: userId } : {}),
        ...(paystackReference ? { paystack_reference: paystackReference } : {}),
        payment_provider: paymentProvider,
        amount,
        name: data.isAnonymous ? "Anonymous" : data.name || null,
        email: data.email,
        message: data.message || null,
        is_anonymous: data.isAnonymous,
        status: "completed",
      },
    });

    await tx.wishlist_items.update({
      where: { id: itemId },
      data: { contributed: { increment: amount } },
    });

    const item = await tx.wishlist_items.findUnique({
      where: { id: itemId },
      select: { price: true, contributed: true, funded_at: true },
    });

    let newlyFunded = false;
    if (
      item &&
      !item.funded_at &&
      Number(item.contributed) >= Number(item.price)
    ) {
      await tx.wishlist_items.update({
        where: { id: itemId },
        data: { funded_at: new Date() },
      });
      newlyFunded = true;
    }

    return { contribution, newlyFunded };
  });

  try {
    const itemWithWishlist = await prisma.wishlist_items.findUnique({
      where: { id: itemId },
      select: {
        name: true,
        price: true,
        wishlist: {
          select: {
            title: true,
            slug: true,
            user: { select: { fullName: true, email: true, username: true } },
          },
        },
      },
    });

    if (itemWithWishlist) {
      revalidateSharePath(
        itemWithWishlist.wishlist.user.username,
        itemWithWishlist.wishlist.slug,
      );
    }

    const owner = itemWithWishlist?.wishlist.user;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";
    const wishlistUrl = owner?.username
      ? `${appUrl}/${owner.username}/${itemWithWishlist?.wishlist.slug}`
      : `${appUrl}/dashboard/wishlists`;

    if (itemWithWishlist && data.email) {
      sendWishlistGiftReceiptEmail({
        to: data.email,
        giverName: data.name || null,
        wishlistTitle: itemWithWishlist.wishlist.title,
        itemName: itemWithWishlist.name,
        amount,
        wishlistUrl,
        reference:
          result.contribution.paystack_reference ?? paystackReference ?? null,
        giftNote: data.message,
        isAnonymous: data.isAnonymous,
      }).catch((err) =>
        console.error("Error sending wishlist gift receipt email:", err),
      );
    }

    if (!owner?.email || !itemWithWishlist)
      return mapPrismaToWishlistContribution(result.contribution);

    const giverName = data.isAnonymous
      ? "An anonymous giver"
      : data.name || "A giver";

    sendWishlistContributionEmail({
      to: owner.email,
      ownerName: owner.fullName || "Wishlist Owner",
      giverName,
      wishlistTitle: itemWithWishlist.wishlist.title,
      itemName: itemWithWishlist.name,
      amount,
      wishlistUrl,
      giftNote: data.message,
    }).catch((err) =>
      console.error("Error sending wishlist contribution email:", err),
    );

    if (result.newlyFunded) {
      sendWishlistItemFundedEmail({
        to: owner.email,
        ownerName: owner.fullName || "Wishlist Owner",
        wishlistTitle: itemWithWishlist.wishlist.title,
        itemName: itemWithWishlist.name,
        amount: Number(itemWithWishlist.price),
        wishlistUrl,
      }).catch((err) =>
        console.error("Error sending wishlist funded email:", err),
      );
    }
  } catch (emailError) {
    console.error("Error fetching wishlist owner for email:", emailError);
  }

  return mapPrismaToWishlistContribution(result.contribution);
}

export async function getWishlistGiftByReference(reference: string): Promise<{
  success: boolean;
  error?: string;
  data?: WishlistGiftSummary;
}> {
  try {
    const row = await prisma.wishlist_contributions.findFirst({
      where: { paystack_reference: reference },
      select: {
        amount: true,
        name: true,
        is_anonymous: true,
        created_at: true,
        item: {
          select: {
            name: true,
            wishlist: {
              select: {
                title: true,
                slug: true,
                user: { select: { username: true } },
              },
            },
          },
        },
      },
    });
    if (!row) return { success: false, error: "Gift not found" };

    const username = row.item.wishlist.user.username;
    return {
      success: true,
      data: {
        itemName: row.item.name,
        amount: Number(row.amount),
        giverName: row.is_anonymous ? "Anonymous" : row.name || "A giver",
        wishlistTitle: row.item.wishlist.title,
        sharePath: username ? `/${username}/${row.item.wishlist.slug}` : null,
        createdAt: toIso(row.created_at),
      },
    };
  } catch (error) {
    console.error("Error loading wishlist gift:", error);
    return { success: false, error: "Could not load the gift" };
  }
}
