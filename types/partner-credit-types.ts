export type PartnerStatus =
  | "pending_approval"
  | "invited"
  | "active"
  | "exhausted"
  | "suspended"
  | "rejected";

export type PartnerCreditRequestKind = "initial_grant" | "top_up";

export type PartnerCreditRequestStatus =
  "pending_approval" | "approved" | "rejected";

export type PartnerCreditTransactionType =
  "initial_grant" | "top_up" | "allocation" | "employee_match" | "adjustment";

export interface PartnerAccountSummary {
  id: string;
  name: string;
  contactEmail: string;
  status: PartnerStatus;
  creditsIssued: number;
  creditsUsed: number;
  creditsAvailable: number;
  utilizationPct: number;
  expiresAt: string;
  isExpired: boolean;
  eligibleCategories: string[];
  rulesNote: string | null;
  maxPerCampaign: number | null;
  employeeMatchingEnabled: boolean;
  matchingRatio: string;
  reconciliationRef: string | null;
  partnerSince: string | null;
  createdAt: string;
}

export interface PartnerCreditKpis {
  partnerCount: number;
  creditsIssued: number;
  creditsUsed: number;
  expiringIn30Days: number;
}

export interface PartnerCreditRequestItem {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  kind: PartnerCreditRequestKind;
  amount: number;
  reconciliationRef: string | null;
  note: string | null;
  status: PartnerCreditRequestStatus;
  requestedById: string;
  requesterName: string;
  createdAt: string;
}

export interface AdminPartnerCreditsDashboardData {
  kpis: PartnerCreditKpis;
  partners: PartnerAccountSummary[];
  pendingRequests: PartnerCreditRequestItem[];
  currentAdminId: string;
}

export interface PartnerCreditTransactionItem {
  id: string;
  type: PartnerCreditTransactionType;
  amount: number;
  causeId: string | null;
  causeTitle: string | null;
  showAsSupporter: boolean;
  note: string | null;
  createdAt: string;
}

export interface EligibleCauseOption {
  id: string;
  title: string;
  category: string;
  goal: number;
  raised: number;
  allocatedByPartner: number;
}

export interface PartnerCreditsDashboardData {
  partner: PartnerAccountSummary | null;
  transactions: PartnerCreditTransactionItem[];
  pendingTopUpRequests: PartnerCreditRequestItem[];
  eligibleCauses: EligibleCauseOption[];
}

export type PartnerActionResult<T = undefined> =
  { success: true; data?: T } | { success: false; error: string };
