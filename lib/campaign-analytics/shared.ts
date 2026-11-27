export const CAMPAIGN_ANALYTICS_TAG = "campaign-analytics";

export const ownerSelect = {
  displayName: true,
  fullName: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

export const ownerName = (user: {
  displayName: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}) =>
  user.displayName ||
  user.fullName ||
  [user.firstName, user.lastName].filter(Boolean).join(" ") ||
  user.email ||
  "Unknown creator";
