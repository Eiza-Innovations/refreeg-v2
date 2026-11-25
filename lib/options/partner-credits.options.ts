import type { Option } from "@/types/options";

export const partnerStatusFilterOptions = [
  { label: "All partners", value: "all" },
  { label: "Pending approval", value: "pending_approval" },
  { label: "Active", value: "active" },
  { label: "Invited", value: "invited" },
  { label: "Exhausted", value: "exhausted" },
  { label: "Suspended", value: "suspended" },
] as const satisfies readonly Option[];

export const partnerCategoryOptions = [
  { label: "Education", value: "education" },
  { label: "Healthcare", value: "health" },
  { label: "Environment", value: "environment" },
  { label: "Community", value: "community" },
  { label: "Disaster Relief", value: "disaster" },
  { label: "Animal Welfare", value: "animals" },
  { label: "Creative", value: "creative" },
  { label: "Business", value: "business" },
] as const satisfies readonly Option[];

export const partnerManageStatusOptions = [
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
] as const satisfies readonly Option[];
