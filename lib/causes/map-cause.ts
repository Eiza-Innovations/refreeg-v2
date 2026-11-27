import type { Cause } from "@/types";

/** Turns a Prisma cause row into the app's `Cause` shape (snake_case, ISO dates, numbers). */
export const mapPrismaToCause = (prismaCause: any): Cause => {
  return {
    ...prismaCause,
    user_id: prismaCause.userId,

    goal: prismaCause.goal ? Number(prismaCause.goal) : 0,
    raised: prismaCause.raised ? Number(prismaCause.raised) : 0,
    shared: prismaCause.shared ? Number(prismaCause.shared) : 0,

    created_at:
      prismaCause.createdAt instanceof Date
        ? prismaCause.createdAt.toISOString()
        : prismaCause.createdAt,
    updated_at:
      prismaCause.updatedAt instanceof Date
        ? prismaCause.updatedAt.toISOString()
        : prismaCause.updatedAt,
    start_date:
      prismaCause.start_date instanceof Date
        ? prismaCause.start_date.toISOString()
        : prismaCause.start_date,
    end_date:
      prismaCause.end_date instanceof Date
        ? prismaCause.end_date.toISOString()
        : prismaCause.end_date,
    rejection_reason: prismaCause.rejectionReason,
    days_active: prismaCause.daysActive,
    video_links: prismaCause.videoLinks,
    compliance_paused: prismaCause.compliance_paused || false,
  } as unknown as Cause;
};
