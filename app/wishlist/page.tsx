import type { Metadata } from "next";

import { WishlistLanding } from "@/components/wishlist/wishlist-landing";
import { isWishlistSeasonActive } from "@/lib/wishlist/season";

export const metadata: Metadata = {
  title: "Wishlist",
  description:
    "Name the gifts you actually want, share one link, and let family and friends give toward them together, anonymously if they prefer.",
};

export default function WishlistPage() {
  return <WishlistLanding seasonal={isWishlistSeasonActive()} />;
}
