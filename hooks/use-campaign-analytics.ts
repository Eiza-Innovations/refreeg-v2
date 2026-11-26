"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsBoolean, parseAsStringLiteral, useQueryState } from "nuqs";
import {
  getCampaignDropOff,
  getCampaignOverview,
  getFraudRisk,
  getFundingVelocity,
} from "@/actions/admin/campaign-analytics-actions";
import type { AnalyticsPeriod } from "@/types/campaign-analytics-types";

const ANALYTICS_KEY = "campaign-analytics";
const periods = ["day", "month", "year"] as const;

type ActionResult<T> = { data: T | null; error: string | null };

export function useAnalyticsQuery<T>(
  key: unknown[],
  load: () => Promise<ActionResult<T>>,
  enabled = true,
) {
  const query = useQuery({
    queryKey: [ANALYTICS_KEY, ...key],
    queryFn: load,
    staleTime: 60_000,
    enabled,
  });
  return {
    data: query.data?.data ?? null,
    isLoading: query.isPending,
    error: query.data?.error ?? query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/** Period and compare toggle live in the URL so they carry across the analytics pages. */
export function useAnalyticsPeriod() {
  const [period, setPeriod] = useQueryState(
    "period",
    parseAsStringLiteral(periods).withDefault("month"),
  );
  const [compare, setCompare] = useQueryState(
    "compare",
    parseAsBoolean.withDefault(false),
  );
  return { period, setPeriod, compare, setCompare };
}

export const useCampaignOverview = (period: AnalyticsPeriod) =>
  useAnalyticsQuery(["overview", period], () => getCampaignOverview(period));

export const useFundingVelocity = (period: AnalyticsPeriod) =>
  useAnalyticsQuery(["velocity", period], () => getFundingVelocity(period));

export const useCampaignDropOff = (period: AnalyticsPeriod) =>
  useAnalyticsQuery(["drop-off", period], () => getCampaignDropOff(period));

export const useFraudRisk = () =>
  useAnalyticsQuery(["fraud-risk"], () => getFraudRisk());

/** Call after a risk decision so every analytics screen refetches. */
export function useRefreshCampaignAnalytics() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [ANALYTICS_KEY] });
}
