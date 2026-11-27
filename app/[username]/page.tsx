import { getProfileByUsername } from "@/actions/users/profile-actions";
import { getUserCauses } from "@/actions/causes/cause-actions";
import { listUserDonations } from "@/actions/donations/donation-actions";
import { getUserPetitions } from "@/actions/petitions/petition-actions";
import {
  listPublicWishlistsByUsername,
  listWishlistGiftsByUsername,
} from "@/actions/wishlists/wishlist-actions";
import { getSessionUser } from "@/lib/auth/session-user";
import { getOrganizationPublicProfile } from "@/actions/users/organization-actions";
import PublicProfile from "@/components/profile/PublicProfile";
import OrganizationPublicProfile from "@/components/profile/OrganizationPublicProfile";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMediaUrl } from "@/lib/s3/media";

type PageParams = {
  username: string;
};

type SearchParams = {
  tab?: string;
  view?: string;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: "Profile not found" };

  const name = profile.full_name || `@${username}`;
  const description =
    profile.bio?.trim() ||
    `See ${name}'s causes, petitions and wishlists on Refreeg.`;
  const photo = getMediaUrl(profile.profile_photo);
  const image = photo ? new URL(photo, APP_URL).toString() : "/og-image.png";

  return {
    title: name,
    description,
    alternates: { canonical: `${APP_URL}/${username}` },
    openGraph: {
      title: `${name} on Refreeg`,
      description,
      url: `${APP_URL}/${username}`,
      type: "profile",
      images: [{ url: image, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} on Refreeg`,
      description,
      images: [image],
    },
  };
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) {
  const { username } = await params;
  const { view } = await searchParams;

  const currentUser = await getSessionUser();

  const profile = await getProfileByUsername(username);
  if (!profile) {
    notFound();
  }

  const userId = profile.id;
  const isOwner = currentUser?.id === userId;

  const [causes, petitions, wishlists, wishlistGifts] = await Promise.all([
    getUserCauses(userId).then((items) =>
      items.filter((cause) => cause.status === "approved"),
    ),
    getUserPetitions(userId).then((items) =>
      items.filter((petition) => petition.status === "approved"),
    ),
    listPublicWishlistsByUsername(username).then((result) =>
      result.success && result.data ? result.data : [],
    ),
    listWishlistGiftsByUsername(username),
  ]);

  if (profile.account_type === "organization" && view !== "personal") {
    const organization = await getOrganizationPublicProfile(userId);

    if (organization) {
      if (!organization.publicProfile && !isOwner) {
        notFound();
      }

      return (
        <div className="relative">
          <OrganizationPublicProfile
            organization={organization}
            profile={profile}
            causes={causes}
            petitions={petitions}
            userId={userId}
            isOwner={isOwner}
          />
        </div>
      );
    }
  }

  const donations = await listUserDonations(userId).then((items) =>
    items.filter((donation) => (donation.cause as any)?.status === "approved"),
  );

  return (
    <div className="relative">
      <PublicProfile
        profile={profile}
        causes={causes}
        donations={donations}
        wishlistGifts={wishlistGifts}
        petitions={petitions}
        wishlists={wishlists}
        username={username}
        isOwner={isOwner}
      />
    </div>
  );
}
