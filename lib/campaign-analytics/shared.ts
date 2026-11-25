import { Prisma } from "@prisma/client";

export const CAMPAIGN_ANALYTICS_TAG = "campaign-analytics";

/** Completed card/transfer and crypto gifts in naira, as one row source. */
export const giftsSql = Prisma.sql`
  SELECT cause_id, amount::float8 AS amount, created_at, email
  FROM donations WHERE status = 'completed'
  UNION ALL
  SELECT cause_id, amount_in_naira::float8, created_at, NULL
  FROM crypto_donations WHERE status = 'completed'
`;

export const launchedAtSql = Prisma.sql`COALESCE(c.start_date, c.created_at)`;

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
