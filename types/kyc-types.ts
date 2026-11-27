import type { Profile } from "@/types";
import type { DecisionSummary, RecordCheckRow } from "@/lib/didit";

export type KycStatus =
  "pending" | "in_progress" | "approved" | "rejected" | "resubmitted";

export interface KycVerification {
  id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  status: KycStatus;
  verification_notes?: string;
  full_name?: string;
  dob?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal?: string;
  country?: string;
  face_match_score?: number | null;
  id_type?: string | null;
  id_number?: string | null;
  checks_passed?: number | null;
  checks_total?: number | null;
  created_at: string;
  updated_at: string;
}

export type KycQueueTab =
  "needs-review" | "resubmitted" | "approved" | "rejected";

export interface KycQueueItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: KycStatus;
  idLabel: string;
  idType: string | null;
  idNumber: string | null;
  faceMatchScore: number | null;
  checksPassed: number | null;
  checksTotal: number | null;
  submittedAt: string;
}

export type PendingReferralRow = {
  id_v1: string;
  referrer_id_v1: string;
};

export type AdminKycRow = {
  id: string;
  user_id: string;
  status: string;
  document_type: string;
  id_type: string | null;
  id_number: string | null;
  face_match_score: number | null;
  checks_passed: number | null;
  checks_total: number | null;
  created_at: Date | null;
  full_name: string | null;
  email: string | null;
  profile_name: string | null;
};

export interface AdminKycQueueSnapshot {
  items: KycQueueItem[];
  counts: Record<KycQueueTab, number>;
  nextReviewUserId: string | null;
  error: string | null;
}

export interface AdminKycNeighbors {
  prevUserId: string | null;
  nextUserId: string | null;
  error: string | null;
}

export interface AdminKycDetail {
  kyc: KycVerification | null;
  profile: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    createdAt: string | null;
  } | null;
  decision: DecisionSummary | null;
  decisionError: string | null;
  attempts: number;
  recordRows: RecordCheckRow[];
  recordSource: string | null;
  error: string | null;
}

export type KycBadgeVariant =
  "verified" | "pending" | "blue" | "gold" | "critical" | "held";

export type KycCalloutVariant = "forest" | "gold" | "sand" | "rust";

export interface KycStatusMeta {
  badge: {
    variant: KycBadgeVariant;
    label: string;
  };
  callout: {
    variant: KycCalloutVariant;
    title: string;
    description: string;
  };
  summary: string;
  ctaLabel: string | null;
}

export interface KycDocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string;
}

export interface KycLegacyDetailsCardProps {
  kycData: KycVerification;
}

export interface KycTabProps {
  profile: Profile;
  initialKyc: KycVerification | null;
  initialError: string | null;
}

export interface KycSettingsContentProps {
  profile: Profile | null;
  userId: string;
  initialKyc: KycVerification | null;
  initialError: string | null;
}

export interface KycSetupClientProps {
  userId: string;
  rejectedKyc: KycVerification | null;
  kycFetchError: string | null;
  currentKyc: KycVerification | null;
}

export interface DiditKycFormProps {
  userId: string;
  rejectedNote?: string | null;
  kycFetchError?: string | null;
}

export interface KycStatusCardProps {
  kycData: KycVerification;
  context?: "overview" | "setup";
  isPolling?: boolean;
}
