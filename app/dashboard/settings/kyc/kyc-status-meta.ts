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

export const kycUnlockedFeatures = [
  {
    title: "Launch campaigns",
    description: "Publish verified donation fundraisers for causes you run.",
  },
  {
    title: "Create petitions",
    description: "Rally public signatures and share verified civic campaigns.",
  },
  {
    title: "Build wishlists",
    description: "Accept direct contributions toward itemized community needs.",
  },
  {
    title: "Direct payouts",
    description: "Withdraw cleared funds straight to your linked bank account.",
  },
] as const;

export const kycPendingSteps = [
  {
    step: "1",
    label: "ID & selfie submitted",
    detail: "Received securely via Didit",
    state: "done",
  },
  {
    step: "2",
    label: "Automated Didit review",
    detail: "Checking document & facial match",
    state: "active",
  },
  {
    step: "3",
    label: "Verified & unlocked",
    detail: "Email sent as soon as it clears",
    state: "upcoming",
  },
] as const;

export const kycRetryChecklist = [
  "Use a valid, unexpired government-issued photo ID",
  "Capture all four corners in bright, even lighting with no glare",
  "Remove glasses, hats, or masks during the selfie scan",
] as const;
