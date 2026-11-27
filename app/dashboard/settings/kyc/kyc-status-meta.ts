import type { KycStatus, KycStatusMeta } from "@/types/kyc-types";

export const kycStatusMeta: Record<KycStatus, KycStatusMeta> = {
  approved: {
    badge: { variant: "verified", label: "Verified" },
    callout: {
      variant: "forest",
      title: "Identity verified",
      description:
        "Your account is verified. You can create campaigns, petitions, wishlists, and withdraw funds.",
    },
    summary: "Your identity is verified and all creator features are unlocked.",
    ctaLabel: null,
  },
  pending: {
    badge: { variant: "pending", label: "Pending review" },
    callout: {
      variant: "gold",
      title: "Verification under review",
      description:
        "Didit is checking your ID and selfie. Reviews usually finish within a few minutes (up to 24 hours); we'll email you once done.",
    },
    summary: "Your documents are being reviewed automatically by Didit.",
    ctaLabel: null,
  },
  in_progress: {
    badge: { variant: "blue", label: "In progress" },
    callout: {
      variant: "sand",
      title: "Verification incomplete",
      description:
        "You started a Didit check but haven't finished submitting your ID and selfie.",
    },
    summary: "Resume your verification session to finish submitting.",
    ctaLabel: "Resume verification",
  },
  resubmitted: {
    badge: { variant: "gold", label: "Action required" },
    callout: {
      variant: "sand",
      title: "Updates needed",
      description:
        "A few details need a quick retry before we can approve your verification.",
    },
    summary: "Resume your verification to address the requested updates.",
    ctaLabel: "Resume verification",
  },
  rejected: {
    badge: { variant: "critical", label: "Rejected" },
    callout: {
      variant: "rust",
      title: "Verification not approved",
      description:
        "Review the note below and submit a clear photo of your ID and selfie to try again.",
    },
    summary: "Your previous submission was not approved.",
    ctaLabel: "Resubmit verification",
  },
};

export const kycBenefits = [
  {
    key: "trust",
    title: "Platform trust",
    description:
      "Show donors and supporters that your identity is verified on RefreeG.",
  },
  {
    key: "access",
    title: "Full creator access",
    description:
      "Unlock campaign creation, petitions, wishlists, and wallet payouts.",
  },
  {
    key: "speed",
    title: "Under 2 minutes",
    description:
      "Automated ID and biometric verification with Didit finishes in minutes.",
  },
] as const;

export const diditChecklistSteps = [
  {
    step: "1",
    title: "Government-issued photo ID",
    description: "Have a valid NIN card/slip, passport, or driver's license.",
  },
  {
    step: "2",
    title: "Quick biometric selfie scan",
    description: "Complete a 10-second facial match to confirm your ID photo.",
  },
  {
    step: "3",
    title: "Good lighting & clear camera",
    description: "Keep your face and document sharp and free of glare.",
  },
] as const;
