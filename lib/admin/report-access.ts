import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "@/actions/admin/role-actions";
import { analyticsPeriodSchema } from "@/lib/schemas/campaign-analytics.schema";
import type { AnalyticsPeriod } from "@/types/campaign-analytics-types";

export const UNAUTHORIZED = {
  success: false,
  error: "Unauthorized",
  data: null,
};

/** Signed-in admin or manager id, else null. */
export async function requireReviewer(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !(await isAdminOrManager(userId))) return null;
  return userId;
}

/** Auth, period check and a readable error around an analytics query. */
export async function readReport<T>(
  period: AnalyticsPeriod | null,
  load: () => Promise<T>,
) {
  if (!(await requireReviewer())) return UNAUTHORIZED;
  if (period !== null && !analyticsPeriodSchema.safeParse(period).success) {
    return { success: false, error: "Unknown period", data: null };
  }
  try {
    return { success: true, error: null, data: await load() };
  } catch (error) {
    console.error("Analytics report failed:", error);
    return {
      success: false,
      error:
        "This report couldn't be loaded from the database. Try again shortly.",
      data: null,
    };
  }
}
