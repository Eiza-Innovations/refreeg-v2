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

/** One row of the owner-only givers panel (delivery coordination). */
export interface WishlistContributor {
  id: string;
  itemName: string;
  amount: number;
  name: string | null;
  email: string;
  message: string | null;
  isAnonymous: boolean;
  createdAt: string | null;
}

/** Shape the contribution dialog posts; the server re-derives the rest. */
export interface WishlistContributionData {
  amount: number;
  name?: string;
  email: string;
  message?: string;
  isAnonymous: boolean;
}

/** Public-safe confirmation the /received page shows after checkout: no
 * emails, anonymous givers stay masked. */
export interface WishlistGiftSummary {
  itemName: string;
  amount: number;
  giverName: string;
  wishlistTitle: string;
  /** /<username>/<slug> when the owner has a public page, else null. */
  sharePath: string | null;
  createdAt: string | null;
}
