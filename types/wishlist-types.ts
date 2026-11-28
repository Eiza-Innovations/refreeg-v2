export interface Wishlist {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  message: string | null;
  status: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  name: string;
  price: number;
  contributed: number;
  note: string | null;
  image_url?: string | null;
  sort_order: number;
  funded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WishlistContribution {
  id: string;
  item_id: string;
  user_id: string | null;
  amount: number;
  name: string | null;
  email: string;
  message: string | null;
  is_anonymous: boolean;
  status: string;
  paystack_reference: string | null;
  payment_provider: string;
  created_at: string;
}

export interface WishlistWithItems extends Wishlist {
  items: WishlistItem[];
}

export type WishlistOwnerPayoutState = "ready" | "kyc_pending" | "bank_missing";

export interface WishlistContributor {
  id: string;
  itemName: string;
  amount: number;
  name: string | null;
  message: string | null;
  isAnonymous: boolean;
  createdAt: string | null;
}

export interface WishlistContributionData {
  amount: number;
  name?: string;
  email: string;
  message?: string;
  isAnonymous: boolean;
}

export interface WishlistGiftSummary {
  itemName: string;
  amount: number;
  giverName: string;
  wishlistTitle: string;
  sharePath: string | null;
  createdAt: string | null;
}

export interface PublicWishlistSummary {
  id: string;
  title: string;
  slug: string;
  created_at: string | null;
  item_count: number;
  funded_count: number;
  contributed_total: number;
  target_total: number;
  preview_images: string[];
}

/** Public, active wishlist for the /wishlist landing carousel. */
export interface DiscoverableWishlist extends PublicWishlistSummary {
  ownerUsername: string;
  ownerName: string | null;
}

export interface WishlistGiftAttempt {
  email: string;
  giverName: string;
  itemName: string;
  wishlistTitle: string;
  wishlistUrl: string;
  attemptedAt: string;
}

export interface WishlistGiftEntry {
  id: string;
  itemName: string;
  wishlistTitle: string;
  wishlistPath: string | null;
  amount: number;
  giverName: string | null;
  isAnonymous: boolean;
  createdAt: string | null;
}
