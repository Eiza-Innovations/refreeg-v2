"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CampaignOverview } from "@/types/campaign-analytics-types";

export function FundingCurveChart({
  curve,
  cohortLabel,
}: Pick<CampaignOverview, "curve" | "cohortLabel">) {
  const config = {
    cohort: {
      label: `${cohortLabel} launches`,
      color: "hsl(var(--blue-accent))",
    },
    average: { label: "12-month average", color: "hsl(var(--ink) / 0.45)" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-3">
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <LineChart data={curve} margin={{ left: -16, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickFormatter={(day) => `D${day}`}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
            width={48}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  `Day ${payload?.[0]?.payload.day}`
                }
                formatter={(value, name) =>
                  `${config[name as keyof typeof config].label}: ${Math.round(Number(value))}% of goal`
                }
              />
            }
          />
          <Line
            dataKey="average"
            stroke="var(--color-average)"
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            dataKey="cohort"
            stroke="var(--color-cohort)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ChartContainer>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-accent/10 px-2.5 py-1 text-blue-accent">
          <span className="h-2 w-2 rounded-full bg-blue-accent" />
          {config.cohort.label}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-muted px-2.5 py-1 text-ink/70">
          <span className="h-2 w-2 rounded-full bg-ink/40" />
          {config.average.label}
        </span>
      </div>
    </div>
  );
}
