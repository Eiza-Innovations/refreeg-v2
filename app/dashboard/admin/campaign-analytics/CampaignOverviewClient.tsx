"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsHeader } from "@/components/admin/campaign-analytics/AnalyticsHeader";
import { FundingCurveChart } from "@/components/admin/campaign-analytics/FundingCurveChart";
import { FunnelBars } from "@/components/admin/campaign-analytics/FunnelBars";
import { OverviewKpis } from "@/components/admin/campaign-analytics/OverviewKpis";
import { RiskDetailSheet } from "@/components/admin/campaign-analytics/RiskDetailSheet";
import {
  useAnalyticsPeriod,
  useCampaignDropOff,
  useCampaignOverview,
  useFraudRisk,
} from "@/hooks/use-campaign-analytics";
import { downloadCsv } from "@/lib/download-csv";
import type { RiskRow } from "@/types/campaign-analytics-types";
import { fraudRiskColumns } from "./fraud-risk/columns";

const BASE = "/dashboard/admin/campaign-analytics";
const TOP_RISKS = 3;

const round = (value: number | null) =>
  value == null ? null : Math.round(value);

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-accent hover:underline"
    >
      {label}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

export function CampaignOverviewClient() {
  const router = useRouter();
  const { period, compare } = useAnalyticsPeriod();
  const overview = useCampaignOverview(period);
  const dropOff = useCampaignDropOff(period);
  const risk = useFraudRisk();
  const [selected, setSelected] = useState<RiskRow | null>(null);
  const columns = useMemo(() => fraudRiskColumns(setSelected), []);

  const data = overview.data;
  const error = overview.error ?? risk.error;

  const handleExport = () => {
    if (!data) return;
    downloadCsv(
      `campaign-analytics-${period}`,
      ["Metric", "This period", "Last period"],
      [
        [
          "Success rate (%)",
          round(data.successRate.value),
          round(data.successRate.previous),
        ],
        [
          "Median funding velocity (₦/day)",
          round(data.velocityPerDay.value),
          round(data.velocityPerDay.previous),
        ],
        [
          "Median days to goal",
          round(data.daysToGoal.value),
          round(data.daysToGoal.previous),
        ],
        ["High fraud risk campaigns", data.highRiskCount, null],
        ...(dropOff.data?.steps ?? []).map((row) => [
          `Funnel: ${row.step}`,
          row.sessions,
          row.previous,
        ]),
      ],
    );
  };

  return (
    <div className="space-y-6">
      <AnalyticsHeader
        title="Campaign analytics"
        description="How campaigns raise money, where donors drop off, and which campaigns look risky."
        onExport={data ? handleExport : undefined}
      />

      {error ? (
        <EmptyState
          variant="page"
          className="py-16"
          icon={<AlertTriangle className="h-7 w-7 text-rust" />}
          title="Campaign analytics are unavailable"
          description={error}
          action={
            <Button variant="ink" size="sm" onClick={() => router.refresh()}>
              Try again
            </Button>
          }
        />
      ) : (
        <>
          <OverviewKpis data={data} compare={compare} />

          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <Card variant="surface">
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">Funding velocity</CardTitle>
                  <p className="text-xs text-ink/50">
                    % of goal by day since launch ·{" "}
                    {data?.cohortLabel ?? "this period"} cohort vs average
                  </p>
                </div>
                <SectionLink href={`${BASE}/velocity`} label="By campaign" />
              </CardHeader>
              <CardContent>
                {!data ? (
                  <Skeleton className="h-56 w-full" />
                ) : data.curve.length === 0 ? (
                  <EmptyState
                    title="No campaigns to chart yet"
                    description="Curves appear once approved campaigns launch in this period."
                  />
                ) : (
                  <FundingCurveChart
                    curve={data.curve}
                    cohortLabel={data.cohortLabel}
                  />
                )}
              </CardContent>
            </Card>

            <Card variant="surface">
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-base">Drop-off points</CardTitle>
                <SectionLink href={`${BASE}/drop-off`} label="Details" />
              </CardHeader>
              <CardContent>
                {dropOff.error ? (
                  <p className="text-sm text-rust">{dropOff.error}</p>
                ) : !dropOff.data ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <FunnelBars steps={dropOff.data.steps} compare={compare} />
                )}
              </CardContent>
            </Card>
          </div>

          <Card variant="surface" className="overflow-hidden py-0">
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-hairline py-3">
              <CardTitle className="text-base">Highest fraud risk</CardTitle>
              <SectionLink
                href={`${BASE}/fraud-risk`}
                label="All risk-scored campaigns"
              />
            </CardHeader>
            <CardContent className="p-0">
              {!risk.data ? (
                <Skeleton className="m-4 h-32" />
              ) : risk.data.rows.length === 0 ? (
                <EmptyState
                  className="m-4"
                  title="No risky campaigns"
                  description="No live campaign scores 40 or higher right now."
                />
              ) : (
                <DataTable
                  columns={columns}
                  data={risk.data.rows.slice(0, TOP_RISKS)}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <RiskDetailSheet campaign={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
