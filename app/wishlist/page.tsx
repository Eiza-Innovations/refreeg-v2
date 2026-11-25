import type { Metadata } from "next";

import { WishlistLanding } from "@/components/wishlist/wishlist-landing";

export const metadata: Metadata = {
  title: "Wishlist | RefreeG",
  description:
    "Name the gifts you actually want, share one link, and let family and friends give toward them — together, anonymously if they prefer.",
};

// The one wishlist route promoted to search engines; personal share pages
// stay noindex (see app/[username]/[slug]/page.tsx).
export default function WishlistPage() {
  return <WishlistLanding />;
}
