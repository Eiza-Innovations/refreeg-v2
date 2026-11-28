import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getWishlistByUsernameAndSlug,
  getWishlistGivers,
} from "@/actions/wishlists/wishlist-actions";
import { listBookmarkedKeys } from "@/actions/users/saved-actions";
import { WishlistGivers } from "@/components/wishlist/wishlist-givers";
import { WishlistView } from "@/components/wishlist/wishlist-view";
import { getSessionUser } from "@/lib/auth/session-user";
import { isWishlistSeasonActive } from "@/lib/wishlist/season";
import { wishlistPublicPath } from "@/lib/wishlist/slug";
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
  const publicUrl = `${APP_URL}${wishlistPublicPath({
    ownerUsername,
    slug: wishlist.slug,
  })}`;

  return {
    title: wishlist.title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: publicUrl },
    openGraph: {
      title,
      description,
      url: publicUrl,
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

  const [givers, bookmarkKeys] = await Promise.all([
    getWishlistGivers(wishlist.id),
    listBookmarkedKeys().catch(() => [] as string[]),
  ]);
  const initialSaved = bookmarkKeys.includes(`wishlist:${wishlist.id}`);

  return (
    <WishlistView
      wishlist={wishlist}
      ownerUsername={ownerUsername}
      viewerIsOwner={viewerIsOwner}
      ownerPayoutReady={ownerPayoutReady}
      ownerPayoutState={ownerPayoutState}
      initialSaved={initialSaved}
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
        givers.success && givers.data ? (
          <WishlistGivers contributors={givers.data} />
        ) : undefined
      }
    />
  );
}
