import type {
  PublicWishlistSummary,
  WishlistGiftEntry,
} from "@/types/wishlist-types";

export type ProfileTabId = "wishlists" | "donations" | "petitions" | "causes";

export type GivingEntry = {
  id: string;
  kind: "cause" | "wishlist";
  title: string;
  context: string;
  href: string | null;
  amount: number;
  giverLabel: string;
  isAnonymous: boolean;
  createdAt: string | null;
};

export type ProfileStat = {
  label: string;
  value: string;
  sub?: string;
};

export type ProfileTab = {
  id: ProfileTabId;
  label: string;
  count: number;
};

export interface PublicProfileProps {
  profile: any;
  causes: any[];
  donations: any[];
  wishlistGifts: WishlistGiftEntry[];
  petitions: any[];
  wishlists: PublicWishlistSummary[];
  username: string;
  isOwner: boolean;
}
