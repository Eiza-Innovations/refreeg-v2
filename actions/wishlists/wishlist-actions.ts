"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";
import type {
  Wishlist,
  WishlistContributor,
  WishlistContribution,
  WishlistContributionData,
  WishlistGiftSummary,
  WishlistItem,
  WishlistOwnerPayoutState,
  WishlistWithItems,
  PaymentProviderType,
} from "@/types";
import {
  WISHLIST_ITEM_CAP,
  wishlistCreateSchema,
  wishlistItemSchema,
  wishlistUpdateSchema,
} from "@/lib/schemas/wishlist.schema";
import { slugifyWishlistTitle } from "@/lib/wishlist/slug";
import {
  sendWishlistContributionEmail,
  sendWishlistItemFundedEmail,
} from "@/services/mail";

const toIso = (value: Date | string | null | undefined) =>
  value instanceof Date ? value.toISOString() : (value ?? null);

const mapPrismaToWishlist = (w: any): Wishlist => ({
  ...w,
  created_at: toIso(w.created_at),
  updated_at: toIso(w.updated_at),
});

const mapPrismaToWishlistItem = (i: any): WishlistItem => ({
  ...i,
  price: Number(i.price),
  contributed: Number(i.contributed),
  funded_at: toIso(i.funded_at),
  created_at: toIso(i.created_at),
  updated_at: toIso(i.updated_at),
});

const mapPrismaToWishlistContribution = (c: any): WishlistContribution => ({
  ...c,
  amount: Number(c.amount),
  created_at: toIso(c.created_at),
});

function isSlugTakenForUser(userId: string, slug: string) {
  return prisma.wishlists
    .findFirst({ where: { user_id: userId, slug }, select: { id: true } })
    .then((row) => row !== null);
}

// Identity verification first, then a bank account: both live in Settings,
// and gifts only split straight to the owner once both are done.
function resolveOwnerPayoutState(user: {
  isVerified: boolean | null;
  subAccountCode: string | null;
}): WishlistOwnerPayoutState {
  if (!user.isVerified) return "kyc_pending";
  if (!user.subAccountCode) return "bank_missing";
  return "ready";
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

// The public share URL is /<username>/<slug>; revalidation and email links
// must use it. Owners without a claimed username have no public page yet.
function wishlistSharePath(username: string | null | undefined, slug: string) {
  return username ? `/${username}/${slug}` : null;
}

function revalidateSharePath(
  username: string | null | undefined,
  slug: string,
) {
  const path = wishlistSharePath(username, slug);
  if (path) revalidatePath(path);
}

export async function createWishlist(input: {
  title: string;
  message?: string;
}): Promise<{ success: boolean; error?: string; data?: Wishlist }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  const parsed = wishlistCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    // The share URL carries the owner's username, so it must exist first.
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

    // A wishlist collects real money for its owner, so payout setup comes
    // before the first list exists, not after the first gift lands.
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
    // Same name, same slug: say so instead of quietly spawning "-2" links.
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
  input: { title?: string; message?: string },
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

    // The slug stays fixed on rename so existing share links keep working.
    const updated = await prisma.wishlists.update({
      where: { id: wishlistId },
      data: {
        ...(parsed.data.title !== undefined
          ? { title: parsed.data.title }
          : {}),
        ...(parsed.data.message !== undefined
          ? { message: parsed.data.message || null }
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

/** Archived wishlists keep their page but stop accepting contributions. */
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

export async function addWishlistItem(
  wishlistId: string,
  input: { name: string; price: number; note?: string },
): Promise<{ success: boolean; error?: string; data?: WishlistItem }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  const parsed = wishlistItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const wishlist = await requireOwnedWishlist(wishlistId, session.user.id);
    if (!wishlist) return { success: false, error: "Wishlist not found" };

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
  input: { name?: string; price?: number; note?: string; sort_order?: number },
): Promise<{ success: boolean; error?: string; data?: WishlistItem }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  const parsed = wishlistItemSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
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
      },
    });
    if (!item || item.wishlist.user_id !== session.user.id) {
      return { success: false, error: "Item not found" };
    }

    // The price is locked once money has landed so the ledger always
    // resolves to a price the owner actually promised.
    if (
      parsed.data.price !== undefined &&
      Number(item.contributed) > 0 &&
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
    if (!item || item.wishlist.user_id !== session.user.id) {
      return { success: false, error: "Item not found" };
    }

    // Deleting a row someone already paid towards would strand money.
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
    const wishlist = await requireOwnedWishlist(wishlistId, session.user.id);
    if (!wishlist) return { success: false, error: "Wishlist not found" };

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
        // The row was matched on this exact username, so the param is the
        // owner's username (the column is nullable, the lookup is not).
        ownerUsername: username,
        viewerIsOwner: session?.user?.id === wishlist.user_id,
        // Ready means identity verified AND bank details on file, so gifts
        // split straight to the owner instead of collecting on the
        // platform. A state flag only, never the payout details themselves.
        ownerPayoutReady: ownerPayoutState === "ready",
        ownerPayoutState,
      },
    };
  } catch (error) {
    console.error("Error loading wishlist:", error);
    return { success: false, error: "Could not load the wishlist" };
  }
}

/** Gates the creation flow: no wishlist until payout setup is complete. */
export async function getWishlistCreationReadiness(): Promise<{
  signedIn: boolean;
  username: string | null;
  payoutState: WishlistOwnerPayoutState;
  /** Boolean flags only, never the payout details themselves. */
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

/**
 * Owner-only contributor list for delivery coordination: the one place
 * giver contact details are visible (decision 9). Public surfaces never
 * call this; ownership is re-checked here so a forged call fails closed.
 */
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
        email: true,
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
        email: row.email,
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

/**
 * Ledger write for a verified charge (mirrors createDonation). Rows and the
 * item's contributed counter move in one transaction; a replayed reference
 * returns the original row instead of double-crediting.
 */
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
    if (!owner?.email || !itemWithWishlist)
      return mapPrismaToWishlistContribution(result.contribution);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";
    // The public page lives at /<username>/<slug>; an owner still onboarding
    // has no public URL, so their email points at the dashboard section.
    const wishlistUrl = owner.username
      ? `${appUrl}/${owner.username}/${itemWithWishlist.wishlist.slug}`
      : `${appUrl}/dashboard/wishlists`;
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

/**
 * Public-safe confirmation for the /received landing after checkout: the
 * reference is the unguessable key, so the payload may show the amount and
 * item, but giver emails never leave the ledger and anonymous names stay
 * masked here just like on the public page.
 */
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
