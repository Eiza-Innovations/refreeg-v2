import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Series } from "@/types/operations-analytics-types";

const AXIS_TICKS = 5;

/** Bars per hour/day/month with the current bucket highlighted. */
export function PeriodBarChart({
  title,
  series,
}: {
  title: string;
  series: Series;
}) {
  const max = Math.max(...series.values, 1);
  const peak = series.values.indexOf(Math.max(...series.values));
  const tickEvery = Math.max(1, Math.ceil(series.labels.length / AXIS_TICKS));

  return (
    <Card variant="surface">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {series.values[peak] > 0 && (
          <p className="text-xs text-ink/50">Peak {series.labels[peak]}</p>
        )}
      </CardHeader>
      <CardContent>
        <div
          className="flex h-48 items-end gap-1"
          role="img"
          aria-label={title}
        >
          {series.values.map((value, index) => (
            <span
              key={series.labels[index] + index}
              title={`${series.labels[index]}: ${value}`}
              className={cn(
                "flex-1 rounded-t-sm",
                index === series.currentIndex
                  ? "bg-blue-accent"
                  : "bg-blue-accent/15",
              )}
              style={{ height: `${Math.max(2, (value / max) * 100)}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-ink/50">
          {series.labels
            .filter(
              (_, index) =>
                index % tickEvery === 0 || index === series.labels.length - 1,
            )
            .map((label, index) => (
              <span key={label + index}>{label}</span>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
