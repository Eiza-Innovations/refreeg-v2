"use server";

import { readReport } from "@/lib/admin/report-access";
import { getAdminOverviewData } from "@/lib/admin-analytics/overview-data";
import { getReviewReportData } from "@/lib/operations-analytics/review-reports";
import { queueKeySchema } from "@/lib/schemas/operations-analytics.schema";
import type { AnalyticsPeriod } from "@/types/campaign-analytics-types";
import type { QueueKey } from "@/types/operations-analytics-types";

export async function getReviewReport(
  queue: QueueKey,
  period: AnalyticsPeriod,
) {
  if (!queueKeySchema.safeParse(queue).success) {
    return { success: false, error: "Unknown report", data: null };
  }
  return readReport(period, () => getReviewReportData(queue, period));
}

export async function getAdminOverview(period: AnalyticsPeriod) {
  return readReport(period, () => getAdminOverviewData(period));
}
