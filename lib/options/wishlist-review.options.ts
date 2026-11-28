/** Admin wishlist queue tabs, mirroring lib/options/kyc-review.options.ts. */
export const wishlistStatusTabs = [
  { label: "Live", value: "live", statuses: ["active"] },
  { label: "Archived", value: "archived", statuses: ["archived"] },
  { label: "Removed", value: "removed", statuses: ["removed"] },
] as const satisfies readonly {
  label: string;
  value: string;
  statuses: string[];
}[];

export type WishlistQueueTab = (typeof wishlistStatusTabs)[number]["value"];
