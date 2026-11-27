import type { LucideIcon } from "lucide-react";

export type InterestOption = {
  id: string;
  label: string;
  icon: LucideIcon;
  campaignCategoryId: string;
};

/** An interest with the number of campaigns in its category, as the server returns it. */
export type InterestOptionWithCount = {
  id: string;
  label: string;
  count: number | null;
};
