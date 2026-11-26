import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getWishlistByUsernameAndSlug,
  getWishlistContributors,
} from "@/actions/wishlists/wishlist-actions";
import { WishlistGivers } from "@/components/wishlist/wishlist-givers";
import { WishlistView } from "@/components/wishlist/wishlist-view";
import { getSessionUser } from "@/lib/auth/session-user";
import { isWishlistSeasonActive } from "@/lib/wishlist/season";

interface WishlistPageProps {
  params: Promise<{ username: string; slug: string }>;
}

// Share links are unguessable but not secret: personal pages stay out of
// search engines entirely; only /wishlist (the landing) is promoted.
export async function generateMetadata({
  params,
}: WishlistPageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const result = await getWishlistByUsernameAndSlug(username, slug);

  return {
    title: result.success ? `${result.data!.wishlist.title}` : "Wishlist",
    robots: { index: false, follow: false },
  };
}

export default async function WishlistSharePage({ params }: WishlistPageProps) {
  const { username, slug } = await params;
  const result = await getWishlistByUsernameAndSlug(username, slug);
  if (!result.success || !result.data) {
    notFound();
  }

  const {
    wishlist,
    ownerUsername,
    viewerIsOwner,
    ownerPayoutReady,
    ownerPayoutState,
  } = result.data;
  const viewer = await getSessionUser();

  // Owner-only: the giver list with contact details never renders for
  // visitors, and the action re-checks ownership on its own.
  const contributors =
    viewerIsOwner && viewer ? await getWishlistContributors(wishlist.id) : null;

  return (
    <WishlistView
      wishlist={wishlist}
      ownerUsername={ownerUsername}
      viewerIsOwner={viewerIsOwner}
      ownerPayoutReady={ownerPayoutReady}
      ownerPayoutState={ownerPayoutState}
      viewer={
        viewer
          ? {
              id: viewer.id,
              name: viewer.name ?? "",
              email: viewer.email ?? "",
            }
          : null
      }
      seasonal={isWishlistSeasonActive()}
      givers={
        contributors?.success && contributors.data ? (
          <WishlistGivers contributors={contributors.data} />
        ) : undefined
      }
    />
  );
}
