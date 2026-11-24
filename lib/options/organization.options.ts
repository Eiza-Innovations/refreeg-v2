import type { Option } from "@/types/options";

export const organisationTypeOptions = [
  { label: "NGO", value: "ngo" },
  { label: "Company (private limited)", value: "company_private" },
  { label: "Company (public listed)", value: "company_public" },
  { label: "Foundation", value: "foundation" },
  { label: "Cooperative", value: "cooperative" },
  { label: "Government agency", value: "government_agency" },
  { label: "Other", value: "other" },
] as const satisfies readonly Option[];

export const countryOptions = [
  { label: "Nigeria", value: "Nigeria" },
  { label: "Ghana", value: "Ghana" },
  { label: "Kenya", value: "Kenya" },
  { label: "South Africa", value: "South Africa" },
  { label: "United Kingdom", value: "United Kingdom" },
  { label: "United States", value: "United States" },
] as const satisfies readonly Option[];

export const financialYearStartOptions = [
  { label: "January", value: "January" },
  { label: "February", value: "February" },
  { label: "March", value: "March" },
  { label: "April", value: "April" },
  { label: "May", value: "May" },
  { label: "June", value: "June" },
  { label: "July", value: "July" },
  { label: "August", value: "August" },
  { label: "September", value: "September" },
  { label: "October", value: "October" },
  { label: "November", value: "November" },
  { label: "December", value: "December" },
] as const satisfies readonly Option[];

export const csrFocusCauseOptions = [
  { label: "Education", value: "education" },
  { label: "Health", value: "health" },
  { label: "Food security", value: "food-security" },
  { label: "Climate", value: "climate" },
  { label: "Women and girls", value: "women-and-girls" },
  { label: "Disaster relief", value: "disaster-relief" },
] as const satisfies readonly Option[];

export const inviteRoleOptions = [
  { label: "Approver", value: "approver" },
  { label: "Viewer", value: "viewer" },
] as const satisfies readonly Option[];

export const organizationPurposeOptions = [
  { label: "Raise funds for our work", value: "fundraising" },
  { label: "Give as a company (CSR)", value: "csr" },
  { label: "Both", value: "both" },
] as const satisfies readonly Option[];
