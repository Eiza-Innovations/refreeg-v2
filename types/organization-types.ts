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
  directorIdKeys: string[];
  submittedAt: string;
};
