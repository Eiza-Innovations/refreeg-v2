import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Small } from "@/components/marketing/Typography";
import { KpiCard } from "@/components/admin/campaign-analytics/KpiCard";
import { BreakdownList } from "@/components/admin/operations/BreakdownList";
import { PeriodBarChart } from "@/components/admin/operations/PeriodBarChart";
import { formatNairaShort } from "@/lib/causes/discover-summary";
import {
  formatHours,
  percentChange,
  periodBucketName,
} from "@/lib/campaign-analytics/format";
import { formatRelativeTime } from "@/lib/format-date";
import type { AnalyticsPeriod } from "@/types/campaign-analytics-types";
import type {
  FactFormat,
  QueueKey,
  ReviewReport,
} from "@/types/operations-analytics-types";

const formatFact: Record<FactFormat, (value: number) => string> = {
  count: (value) => value.toLocaleString(),
  naira: formatNairaShort,
  percent: (value) => `${value.toFixed(1)}%`,
};

const loggedFromNow: QueueKey[] = ["campaigns", "petitions"];

export function ReviewReportView({
  queue,
  data,
  compare,
  period,
}: {
  queue: QueueKey;
  data: ReviewReport | null;
  compare: boolean;
  period: AnalyticsPeriod;
}) {
  if (!data) return <Skeleton className="h-96 w-full rounded-xl" />;

  const { stats } = data;
  const reviewed = data.approved + data.rejected;
  const change = (current: number | null, previous: number | null) =>
    compare ? percentChange(current, previous) : undefined;
  const chartNoun =
    data.seriesKind === "signatures" ? "Signatures" : "Decisions";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Submitted"
          value={stats.inflow.toLocaleString()}
          change={change(stats.inflow, stats.previousInflow)}
        />
        <KpiCard
          label="Decided"
          value={stats.decided.toLocaleString()}
          chip={
            reviewed
              ? `${Math.round((data.approved / reviewed) * 100)}% approved`
              : undefined
          }
          chipVariant="forest"
          change={change(stats.decided, stats.previousDecided)}
        />
        <KpiCard
          label="Waiting now"
          value={stats.backlog.toLocaleString()}
          chip={
            stats.oldestWaitingAt
              ? `oldest ${formatRelativeTime(stats.oldestWaitingAt).replace(" ago", "")}`
              : undefined
          }
          chipVariant="gold"
        />
        <KpiCard
          label="Median wait"
          value={formatHours(stats.medianHours)}
          chip="to decision"
          chipVariant="blue"
          change={change(stats.medianHours, stats.previousMedianHours)}
          lowerIsBetter
        />
      </div>

      {loggedFromNow.includes(queue) && (
        <Small className="block text-ink/50">
          Decision counts and wait times use decisions logged from this release
          on.
        </Small>
      )}

      <PeriodBarChart
        title={`${chartNoun} by ${periodBucketName[period]}`}
        series={data.series}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {data.breakdowns.map((breakdown) => (
          <BreakdownList
            key={breakdown.title}
            title={breakdown.title}
            rows={breakdown.rows}
          />
        ))}
        {data.facts.length > 0 && (
          <Card variant="surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">At a glance</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-hairline text-sm">
                {data.facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex justify-between gap-4 py-2"
                  >
                    <dt className="text-ink/60">{fact.label}</dt>
                    <dd className="font-semibold text-ink">
                      {fact.value == null
                        ? "—"
                        : formatFact[fact.format](fact.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
