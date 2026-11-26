import { prisma } from "@/lib/prisma";
import { WISHLIST_KYC_THRESHOLD_NAIRA } from "@/lib/schemas/wishlist.schema";

/**
 * The payout snapshot the initialize route needs to attach the owner's
 * subaccount split. Verified means bank details are on file (the same
 * triple the JIT Flutterwave block requires); money for unverified owners
 * still collects, it just lands on the platform account.
 */
export interface WishlistOwnerSnapshot {
  id: string;
  fullName: string | null;
  username: string | null;
  email: string | null;
  subAccountCode: string | null;
  flutterwaveSubAccountId: string | null;
  accountNumber: string | null;
  bankName: string | null;
}

/**
 * Server-side re-check before checkout opens (the sheet's client state is
 * advisory only). Throws with a giver-facing message when the gift cannot
 * start, exactly as assertCauseAcceptingDonations does for causes:
 *
 * - the item must exist and belong to an active wishlist,
 * - the item must not be funded,
 * - the gift may not exceed the item's remaining balance (the cap is
 *   server-owned so a stale page cannot overshoot a nearly-funded item),
 * - an owner without verified payout details stops collecting at the
 *   ₦500k fraud ceiling until KYC clears.
 *
 * Resolves the owner payout snapshot in the same read so the route never
 * queries for it twice.
 */
export async function assertWishlistAcceptingGifts(
  itemId: string,
  amount: number,
): Promise<{ owner: WishlistOwnerSnapshot }> {
  const item = await prisma.wishlist_items.findUnique({
    where: { id: itemId },
    select: {
      price: true,
      contributed: true,
      funded_at: true,
      wishlist: {
        select: {
          status: true,
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              email: true,
              subAccountCode: true,
              flutterwaveSubAccountId: true,
              accountNumber: true,
              bankName: true,
            },
          },
        },
      },
    },
  });

  if (!item) {
    throw new Error("This gift is no longer listed on the wishlist.");
  }

  if (item.wishlist.status !== "active") {
    throw new Error(
      "This wishlist is archived, so it is not accepting gifts right now.",
    );
  }

  if (item.funded_at || Number(item.contributed) >= Number(item.price)) {
    throw new Error("This item is already fully funded.");
  }

  const remaining = Number(item.price) - Number(item.contributed);
  if (amount > remaining) {
    throw new Error(
      `This item only needs ₦${remaining.toLocaleString()} more.`,
    );
  }

  const owner = item.wishlist.user;
  if (!owner.subAccountCode) {
    const collected = await prisma.wishlist_contributions.aggregate({
      _sum: { amount: true },
      where: { item: { wishlist: { user_id: owner.id } } },
    });
    const total = Number(collected._sum.amount ?? 0);
    if (total + amount > WISHLIST_KYC_THRESHOLD_NAIRA) {
      throw new Error(
        "This wishlist has reached the ₦500,000 collection cap for owners without verified payout details. The owner can reopen giving by finishing verification in Settings.",
      );
    }
  }

  return { owner };
}
