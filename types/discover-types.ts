export type DiscoverSort =
  | "most-urgent"
  | "closest-to-goal"
  | "newest"
  | "most-given"
  | "closing-soonest";

export interface DiscoverFilters {
  categories?: string[];
  location?: string;
  urgentOnly?: boolean;
  verifiedOnly?: boolean;
  claimedOnly?: boolean;
  nearGoalOnly?: boolean;
  minAmountNeeded?: number;
  maxAmountNeeded?: number;
  includeType?: "all" | "campaigns" | "petitions";
  search?: string;
  sortBy?: DiscoverSort;
}

export interface DiscoverItem {
  type: "campaign" | "petition";
  id: string;
  title: string;
  image: string | null;
  orgName: string;
  verified: boolean;
  raised: number;
  goal: number;
  percent: number;
  daysLeft: number | null;
  urgent: boolean;
  location: string | null;
  paused: boolean;
  createdAt: string;
  /** Completed donations; null for petitions. */
  giftCount: number | null;
}
