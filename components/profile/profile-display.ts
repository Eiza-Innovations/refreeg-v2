import { causePublicPath } from "@/lib/causes/slug";
import { Instagram, Facebook, Linkedin } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import type {
  PublicWishlistSummary,
  WishlistGiftEntry,
} from "@/types/wishlist-types";
import type {
  ProfileStat,
  ProfileTab,
  ProfileTabId,
  GivingEntry,
} from "@/components/profile/profile-types";

export const socials = [
  { key: "instagram_url", label: "Instagram", Icon: Instagram },
  { key: "twitter_url", label: "X (Twitter)", Icon: FaXTwitter },
  { key: "facebook_url", label: "Facebook", Icon: Facebook },
  { key: "linkedin_url", label: "LinkedIn", Icon: Linkedin },
] as const;

export const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`;
  return `₦${amount.toLocaleString()}`;
}

export function formatCount(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function buildProfileStats({
  causes,
  wishlists,
  donations,
  wishlistGifts,
  petitions,
}: {
  causes: any[];
  wishlists: PublicWishlistSummary[];
  donations: any[];
  wishlistGifts: WishlistGiftEntry[];
  petitions: any[];
}): ProfileStat[] {
  const totalRaised =
    causes.reduce((sum, c) => sum + (Number(c.raised) || 0), 0) +
    wishlists.reduce((sum, w) => sum + (Number(w.contributed_total) || 0), 0);
  const totalDonated =
    donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) +
    wishlistGifts.reduce((sum, g) => sum + (Number(g.amount) || 0), 0);
  const totalSignatures = petitions.reduce(
    (sum, p) => sum + (Number(p.signatures ?? p.signature_count) || 0),
    0,
  );
  const activeCauses = causes.filter(
    (c) => !c.ended && (Number(c.raised) || 0) < (Number(c.goal) || 1),
  ).length;
  const activeWishlists = wishlists.length;

  return [
    { label: "Total raised", value: formatCompact(totalRaised) },
    { label: "Donated", value: formatCompact(totalDonated) },
    { label: "Signatures", value: formatCount(totalSignatures) },
    {
      label: "Active",
      value: String(activeCauses + activeWishlists),
      sub: "currently fundraising",
    },
  ];
}

const TAB_TIE_BREAK: ProfileTabId[] = [
  "wishlists",
  "donations",
  "petitions",
  "causes",
];

export function orderTabsByCount(
  counts: Record<ProfileTabId, number>,
): ProfileTab[] {
  const labels: Record<ProfileTabId, string> = {
    wishlists: "Wishlists",
    donations: "Donations",
    petitions: "Petitions",
    causes: "Causes",
  };
  return [...TAB_TIE_BREAK]
    .sort(
      (a, b) =>
        counts[b] - counts[a] ||
        TAB_TIE_BREAK.indexOf(a) - TAB_TIE_BREAK.indexOf(b),
    )
    .map((id) => ({ id, label: labels[id], count: counts[id] }));
}

export function buildGivingEntries(
  donations: any[],
  wishlistGifts: WishlistGiftEntry[],
): GivingEntry[] {
  const causeEntries: GivingEntry[] = donations.map((donation) => ({
    id: `cause-${donation.id}`,
    kind: "cause",
    title: donation.cause?.title || "A cause",
    context: "Cause",
    href:
      (donation.cause as { status?: string } | undefined)?.status === "approved"
        ? causePublicPath({
            id: donation.cause_id,
            slug: donation.cause?.slug,
          })
        : null,
    amount: Number(donation.amount) || 0,
    giverLabel: donation.is_anonymous
      ? "Anonymous gift"
      : donation.name || "Gift",
    isAnonymous: Boolean(donation.is_anonymous),
    createdAt: donation.created_at ?? null,
  }));

  const wishlistEntries: GivingEntry[] = wishlistGifts.map((gift) => ({
    id: `wishlist-${gift.id}`,
    kind: "wishlist",
    title: gift.itemName,
    context: gift.wishlistTitle,
    href: gift.wishlistPath,
    amount: Number(gift.amount) || 0,
    giverLabel: gift.isAnonymous ? "Anonymous gift" : gift.giverName || "Gift",
    isAnonymous: Boolean(gift.isAnonymous),
    createdAt: gift.createdAt,
  }));

  return [...causeEntries, ...wishlistEntries].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}
