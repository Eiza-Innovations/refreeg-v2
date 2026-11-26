export type OrganizationOnboardingSummary = {
  name: string;
  registrationNumber: string;
  purpose: string;
  csrBudget: number | null;
  inviteCount: number;
  verificationStatus: string;
  verificationSubmittedAt: string | null;
  ownerHandle: string;
};

export type OrganizationVerificationRow = {
  id: string;
  organizationName: string;
  registrationNumber: string;
  adminEmail: string;
  country: string;
  registrationDocKey: string;
  statusReportDocKey: string | null;
  memartDocKey: string | null;
  scumlDocKey: string | null;
  tinDocKey: string | null;
  addressProofDocKey: string | null;
  directorIdKeys: string[];
  submittedAt: string;
};
