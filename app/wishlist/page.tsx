import type { Metadata } from "next";

import { WishlistLanding } from "@/components/wishlist/wishlist-landing";
import { PublicWishlistCarousel } from "@/components/wishlist/public-wishlist-carousel";
import { listDiscoverableWishlists } from "@/actions/wishlists/wishlist-actions";
import { listBookmarkedKeys } from "@/actions/users/saved-actions";
import { isWishlistSeasonActive } from "@/lib/wishlist/season";

export const metadata: Metadata = {
  title: "Wishlist",
  description:
    "Name the gifts you actually want, share one link, and let family and friends give toward them together, anonymously if they prefer.",
};

export default async function WishlistPage() {
  const seasonal = isWishlistSeasonActive();
  const [discoverable, savedKeys] = await Promise.all([
    listDiscoverableWishlists(12),
    listBookmarkedKeys().catch(() => [] as string[]),
  ]);

  return (
    <>
      <WishlistLanding seasonal={seasonal} />
      <PublicWishlistCarousel
        items={discoverable.success ? (discoverable.data ?? []) : []}
        savedKeys={savedKeys}
      />
    </>
  );
}
