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
import { getMediaUrl } from "@/lib/s3/media";

interface WishlistPageProps {
  params: Promise<{ username: string; slug: string }>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";

export async function generateMetadata({
  params,
}: WishlistPageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const result = await getWishlistByUsernameAndSlug(username, slug);
  if (!result.success || !result.data) {
    return { title: "Wishlist", robots: { index: false, follow: false } };
  }

  const { wishlist, ownerUsername } = result.data;
  const title = `${wishlist.title} — a wishlist by @${ownerUsername}`;
  const description =
    wishlist.message?.trim() ||
    `A wishlist by @${ownerUsername} on Refreeg — pick a gift and make their day.`;
  const firstPhoto = wishlist.items.find((item) => item.image_url)?.image_url;
  const image = firstPhoto
    ? new URL(getMediaUrl(firstPhoto), APP_URL).toString()
    : "/og-image.png";

  return {
    title: wishlist.title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: `${APP_URL}/${ownerUsername}/${wishlist.slug}`,
      type: "website",
      images: [{ url: image, alt: wishlist.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
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
