import type { Option } from "@/types/options";

export const overviewQueueOptions = [
  { label: "Campaigns", value: "campaigns" },
  { label: "KYC", value: "kyc" },
  { label: "Receipts", value: "receipts" },
  { label: "Petitions", value: "petitions" },
  { label: "Reports", value: "reports" },
] as const satisfies readonly Option[];

export const overviewItemTypeOptions = [
  { label: "Campaign", value: "campaigns" },
  { label: "KYC", value: "kyc" },
  { label: "Receipt", value: "receipts" },
  { label: "Petition", value: "petitions" },
  { label: "Report", value: "reports" },
] as const satisfies readonly Option[];
