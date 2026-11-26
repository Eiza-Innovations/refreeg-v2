"use client";

import { AlertTriangle, Lightbulb, MousePointerClick } from "lucide-react";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { P, Small, Span } from "@/components/marketing/Typography";
import { AnalyticsHeader } from "@/components/admin/campaign-analytics/AnalyticsHeader";
import { FunnelBars } from "@/components/admin/campaign-analytics/FunnelBars";
import { LeaveReasonsList } from "@/components/admin/campaign-analytics/LeaveReasonsList";
import {
  useAnalyticsPeriod,
  useCampaignDropOff,
} from "@/hooks/use-campaign-analytics";
import { downloadCsv } from "@/lib/download-csv";
import { signedPercent } from "@/lib/campaign-analytics/format";
import {
  funnelStepOptions,
  leaveReasonOptions,
} from "@/lib/options/campaign-analytics.options";
import { optionLabel } from "@/lib/options/option-label";

export function DropOffClient() {
  const { period, compare } = useAnalyticsPeriod();
  const dropOff = useCampaignDropOff(period);
  const report = dropOff.data;
  const steps = report?.steps ?? [];
  const views = steps[0]?.sessions ?? 0;
  const paid = steps.at(-1)?.sessions ?? 0;

  const leak = steps
    .slice(1)
    .reduce<{ step: string; lost: number } | null>((worst, row, index) => {
      const before = steps[index].sessions;
      if (!before) return worst;
      const lost = 1 - row.sessions / before;
      return !worst || lost > worst.lost ? { step: row.step, lost } : worst;
    }, null);

  const handleExport = () =>
    downloadCsv(
      `drop-off-${period}`,
      ["Section", "Item", "This period", "Last period"],
      [
        ...steps.map((row) => [
          "Funnel",
          optionLabel(funnelStepOptions, row.step),
          row.sessions,
          row.previous,
        ]),
        ...(report?.reasons ?? []).map((row) => [
          "Left at payment",
          optionLabel(leaveReasonOptions, row.reason),
          row.sessions,
          null,
        ]),
        ...(report?.segments ?? []).map((row) => [
          "Where it's worst",
          `${row.segment} at ${optionLabel(funnelStepOptions, row.step)}`,
          `${Math.round(row.dropVsAverage)}%`,
          null,
        ]),
      ],
    );

  if (dropOff.error) {
    return (
      <EmptyState
        variant="page"
        className="py-16"
        icon={<AlertTriangle className="h-7 w-7 text-rust" />}
        title="Drop-off data is unavailable"
        description={dropOff.error}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AnalyticsHeader
        crumb="Drop-off"
        title="Drop-off points"
        description="From opening a campaign to a completed gift, on the web."
        onExport={views ? handleExport : undefined}
      />

      <Card variant="surface">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Giving funnel</CardTitle>
          {views > 0 && (
            <Small className="text-ink/50">
              {((paid / views) * 100).toFixed(1)}% of views end in a gift
            </Small>
          )}
        </CardHeader>
        <CardContent>
          {!report ? (
            <Skeleton className="h-48 w-full" />
          ) : views === 0 ? (
            <EmptyState
              icon={<MousePointerClick className="h-6 w-6 text-ink/50" />}
              title="No giving activity tracked for this period"
              description="Steps are recorded as people open campaigns and give. Try a longer period."
            />
          ) : (
            <FunnelBars steps={steps} compare={compare} size="full" />
          )}
        </CardContent>
      </Card>

      {report && views > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card variant="surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Why people leave at payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeaveReasonsList reasons={report.reasons} />
            </CardContent>
          </Card>

          <Card variant="surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Where it&rsquo;s worst
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.segments.length === 0 ? (
                <P className="text-ink/60 md:text-sm">
                  No group converts worse than average in this period.
                </P>
              ) : (
                <ul className="divide-y divide-hairline text-sm">
                  {report.segments.map((row) => (
                    <li
                      key={row.segment}
                      className="flex justify-between gap-4 py-2"
                    >
                      <Span className="text-ink/70">{row.segment}</Span>
                      <Span className="text-right font-medium text-rust">
                        {signedPercent(row.dropVsAverage)} at{" "}
                        {optionLabel(funnelStepOptions, row.step).toLowerCase()}
                      </Span>
                    </li>
                  ))}
                </ul>
              )}
              {leak && (
                <CalloutBanner
                  variant="blue"
                  icon={<Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />}
                  title={`Biggest leak: ${optionLabel(funnelStepOptions, leak.step).toLowerCase()}`}
                  description={`${Math.round(leak.lost * 100)}% of people who reach the step before it don't continue. Fixes here move the most gifts.`}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
