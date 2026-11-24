"use client";

import { Small, Strong } from "@/components/marketing/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { Chip } from "./chip";
import { Panel } from "./panel";
import type { Metric } from "./types";

export function MetricCards({
  metrics,
  loading = false,
}: {
  metrics: Metric[];
  loading?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-busy={loading}>
      {metrics.map((metric) => (
        <Panel key={metric.label} className="min-h-[97px]">
          {loading ? (
            <>
              <Skeleton className="h-3 w-24 bg-ink/[0.08]" />
              <Skeleton className="mt-3 h-7 w-36 bg-ink/[0.08]" />
            </>
          ) : (
            <>
              <Small className="block">{metric.label}</Small>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                <Strong className="text-[27px] leading-none tracking-[-1px] tabular-nums">
                  {metric.value}
                </Strong>
                {metric.change && (
                  <Chip
                    tone={metric.tone}
                    className="max-w-[48%] whitespace-normal"
                  >
                    {metric.change}
                  </Chip>
                )}
              </div>
            </>
          )}
        </Panel>
      ))}
    </div>
  );
}
