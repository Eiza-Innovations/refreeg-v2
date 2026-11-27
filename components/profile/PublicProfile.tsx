"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getMediaUrl } from "@/lib/s3/media";
import {
  buildGivingEntries,
  buildProfileStats,
  orderTabsByCount,
} from "@/components/profile/profile-display";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileStats } from "@/components/profile/profile-stats";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { ProfileGivingList } from "@/components/profile/profile-giving-list";
import { ProfileCauseCard } from "@/components/profile/profile-cause-card";
import { ProfilePetitionCard } from "@/components/profile/profile-petition-card";
import { ProfileWishlistCard } from "@/components/profile/profile-wishlist-card";
import { TabEmptyState } from "@/components/profile/tab-empty-state";
import type { ProfileTabId } from "@/components/profile/profile-types";
import type { PublicProfileProps } from "@/components/profile/profile-types";

export default function PublicProfile({
  profile,
  causes,
  donations,
  wishlistGifts,
  petitions,
  wishlists,
  username,
  isOwner,
}: PublicProfileProps) {
  const router = useRouter();

  const displayName: string = profile.full_name || "Anonymous";
  const firstName = displayName.split(" ")[0] || "this user";
  const profileImage = getMediaUrl(profile.profile_photo);
  const bio: string = profile.bio?.trim() || "";

  const counts = useMemo(
    () => ({
      wishlists: wishlists.length,
      donations: donations.length + wishlistGifts.length,
      petitions: petitions.length,
      causes: causes.length,
    }),
    [
      wishlists.length,
      donations.length,
      wishlistGifts.length,
      petitions.length,
      causes.length,
    ],
  );

  const tabs = useMemo(() => orderTabsByCount(counts), [counts]);
  const [tab, setTab] = useState<ProfileTabId>(tabs[0]?.id ?? "wishlists");

  const stats = useMemo(
    () =>
      buildProfileStats({
        causes,
        wishlists,
        donations,
        wishlistGifts,
        petitions,
      }),
    [causes, wishlists, donations, wishlistGifts, petitions],
  );

  const givingEntries = useMemo(
    () => buildGivingEntries(donations, wishlistGifts),
    [donations, wishlistGifts],
  );

  return (
    <div className="min-h-screen w-full bg-cream">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink/60 transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-none sm:p-7">
          <ProfileHeader
            displayName={displayName}
            username={username}
            bio={bio}
            profileImage={profileImage}
            isVerified={!!profile.is_verified}
            isOwner={isOwner}
            profile={profile}
          />
          <ProfileStats stats={stats} />
        </div>

        <div className="mt-8">
          <ProfileTabs tabs={tabs} active={tab} onChange={setTab} />

          <div className="pt-6">
            {tab === "wishlists" &&
              (counts.wishlists === 0 ? (
                <TabEmptyState
                  title="No wishlists yet"
                  description={`${firstName} hasn't created a wishlist yet.`}
                  cta="Explore wishlists"
                  href="/wishlist"
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {wishlists.map((wishlist) => (
                    <ProfileWishlistCard
                      key={wishlist.id}
                      wishlist={wishlist}
                      username={username}
                    />
                  ))}
                </div>
              ))}

            {tab === "donations" &&
              (givingEntries.length === 0 ? (
                <TabEmptyState
                  title="No donations yet"
                  description={`${firstName} hasn't given to any cause or wishlist yet.`}
                  cta="Explore causes"
                  href="/causes"
                />
              ) : (
                <ProfileGivingList entries={givingEntries} />
              ))}

            {tab === "petitions" &&
              (counts.petitions === 0 ? (
                <TabEmptyState
                  title="No petitions yet"
                  description={`${firstName} hasn't created any petitions yet.`}
                  cta="Explore petitions"
                  href="/petitions"
                />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {petitions.map((petition) => (
                    <ProfilePetitionCard
                      key={petition.id}
                      petition={petition}
                    />
                  ))}
                </div>
              ))}

            {tab === "causes" &&
              (counts.causes === 0 ? (
                <TabEmptyState
                  title="No causes yet"
                  description={`${firstName} hasn't started a cause yet. Stay tuned for their first impact story.`}
                  cta="Explore causes"
                  href="/causes"
                />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {causes.map((cause) => (
                    <ProfileCauseCard key={cause.id} cause={cause} />
                  ))}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
