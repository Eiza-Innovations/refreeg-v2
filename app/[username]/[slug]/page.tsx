import { redirect } from "next/navigation";

import { wishlistPublicPath } from "@/lib/wishlist/slug";

// Wishlists moved to /:username/w/:slug. This stub keeps old
// /:username/:slug links (already shared on socials) alive by
// redirecting to the new path.
export default async function LegacyWishlistRedirect({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  redirect(wishlistPublicPath({ ownerUsername: username, slug }));
}
