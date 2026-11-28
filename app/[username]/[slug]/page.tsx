import { redirect } from "next/navigation";

import { wishlistPublicPath } from "@/lib/wishlist/slug";

export default async function LegacyWishlistRedirect({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  redirect(wishlistPublicPath({ ownerUsername: username, slug }));
}
