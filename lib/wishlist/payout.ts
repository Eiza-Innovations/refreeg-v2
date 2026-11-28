import { revalidatePath } from "next/cache";
import type { WishlistOwnerPayoutState } from "@/types";
import { wishlistPublicPath } from "@/lib/wishlist/slug";

export function resolveOwnerPayoutState(user: {
  isVerified: boolean | null;
  subAccountCode: string | null;
}): WishlistOwnerPayoutState {
  if (!user.isVerified) return "kyc_pending";
  if (!user.subAccountCode) return "bank_missing";
  return "ready";
}

export function wishlistSharePath(
  username: string | null | undefined,
  slug: string,
) {
  return username
    ? wishlistPublicPath({ ownerUsername: username, slug })
    : null;
}

export function revalidateSharePath(
  username: string | null | undefined,
  slug: string,
) {
  const path = wishlistSharePath(username, slug);
  if (path) revalidatePath(path);
}
