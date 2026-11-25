"use client";

import {
  getAdminOverview,
  getReviewReport,
} from "@/actions/admin/operations-analytics-actions";
import { useAnalyticsQuery } from "@/hooks/use-campaign-analytics";
import type { AnalyticsPeriod } from "@/types/campaign-analytics-types";
import type { QueueKey } from "@/types/operations-analytics-types";

export const useReviewReport = (
  queue: QueueKey,
  period: AnalyticsPeriod,
  enabled: boolean,
) =>
  useAnalyticsQuery(
    ["operations", queue, period],
    () => getReviewReport(queue, period),
    enabled,
  );

export const useAdminOverview = (period: AnalyticsPeriod) =>
  useAnalyticsQuery(["overview", period], () => getAdminOverview(period));
