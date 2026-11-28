/** What "waiting for review" means per queue; shared by the sidebar badges and the overview. */
export const reviewQueueWhere = {
  campaigns: { status: "pending" },
  kyc: { status: { in: ["pending", "in_progress"] } },
  receipts: { status: "pending" },
  petitions: { status: "pending" },
  reports: { status: "pending" },
  // Wishlists don't queue for review; the badge tracks live wishlists.
  wishlists: { status: "active" },
};
