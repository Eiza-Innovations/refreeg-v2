import type { AuthBrandPanelProps } from "@/types/auth-types";

/** Brand panel copy shown beside the sign-in form. */
export const signinBrand: AuthBrandPanelProps = {
  headline: "Welcome back to transparent impact.",
  subtitle:
    "Every donation tracked, every receipt verified. Continue supporting campaigns that matter.",
  checklist: [
    {
      title: "Real-time updates",
      description: "Follow the causes and petitions you care about.",
    },
    {
      title: "Verified receipts",
      description: "View milestone verifications and project disbursements.",
    },
    {
      title: "100% transparent",
      description: "Direct accountability for every backed initiative.",
    },
  ],
  testimonial: {
    avatarInitials: "TA",
    quote:
      "I can always see the exact progress and milestone proof of every project I've backed.",
    author: "Tunde A. · Lagos",
  },
};
