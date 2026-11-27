import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/admin/campaign-analytics/KpiCard";
import {
  formatNairaCompact,
  percentChange,
} from "@/lib/campaign-analytics/format";
import type { CampaignOverview, Kpi } from "@/types/campaign-analytics-types";

const BASE = "/dashboard/admin/campaign-analytics";

const show = (kpi: Kpi, format: (value: number) => string) =>
  kpi.value == null ? "—" : format(kpi.value);

export function OverviewKpis({
  data,
  compare,
}: {
  data: CampaignOverview | null;
  compare: boolean;
}) {
  if (!data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const changeOf = (kpi: Kpi) =>
    compare ? percentChange(kpi.value, kpi.previous) : undefined;
  const { daysToGoal } = data;
  const daysDelta =
    daysToGoal.value != null && daysToGoal.previous != null
      ? Math.round(daysToGoal.value - daysToGoal.previous)
      : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Success rate"
        value={show(data.successRate, (value) => `${Math.round(value)}%`)}
        chip="reached goal"
        chipVariant="forest"
        change={changeOf(data.successRate)}
      />
      <KpiCard
        label="Funding velocity"
        value={show(
          data.velocityPerDay,
          (value) => `${formatNairaCompact(value)}/day`,
        )}
        chip="median"
        chipVariant="blue"
        change={changeOf(data.velocityPerDay)}
        href={`${BASE}/velocity`}
      />
      <KpiCard
        label="Time to goal"
        value={show(daysToGoal, (value) => `${Math.round(value)} days`)}
        chip={
          daysDelta == null
            ? "median"
            : `${daysDelta > 0 ? "+" : "−"}${Math.abs(daysDelta)} days`
        }
        chipVariant={daysDelta != null && daysDelta > 0 ? "critical" : "forest"}
        change={changeOf(daysToGoal)}
        lowerIsBetter
      />
      <KpiCard
        label="High fraud risk"
        value={String(data.highRiskCount)}
        chip="campaigns"
        chipVariant="critical"
        href={`${BASE}/fraud-risk`}
      />
    </div>
  );
}
