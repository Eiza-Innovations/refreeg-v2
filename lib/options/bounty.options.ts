import type { Option } from "@/types/options";

export const bountyCategoryOptions = [
  { label: "Content creation", value: "content" },
  { label: "Community outreach", value: "outreach" },
  { label: "Fundraising", value: "fundraising" },
  { label: "Research", value: "research" },
  { label: "Volunteer support", value: "volunteer" },
] as const satisfies readonly Option[];

export const bountyCampaignOptions = [
  { label: "Clean water for Odo-Ado", value: "clean-water" },
  { label: "School kits for 300 pupils", value: "school-kits" },
  { label: "Community food bank", value: "food-bank" },
] as const satisfies readonly Option[];

export const bountyQueueStatusOptions = [
  { label: "All submissions", value: "all" },
  { label: "Pending review", value: "in-review" },
  { label: "Changes requested", value: "changes-requested" },
  { label: "Approved", value: "live" },
] as const satisfies readonly Option[];
