"use client";

import { Small } from "@/components/marketing/Typography";
import { LinePlot } from "./charts";
import { Chip } from "./chip";
import { Panel } from "./panel";
import type { AnalyticsViewProps } from "./types";

export function AnalyticsYear({ data, compare }: AnalyticsViewProps) {
  const { donations } = data;
  return (
    <div className="grid gap-4 xl:grid-cols-[1.93fr_1fr]">
      <Panel
        title="Donations by month"
        aside={
          <div className="flex gap-1.5">
            <Chip tone="blue" dot>
              {data.label.slice(0, 4)}
            </Chip>
            {compare && (
              <Chip tone="neutral" dot>
                {data.previousLabel}
              </Chip>
            )}
          </div>
        }
      >
        <div className="[&_svg]:h-[235px]">
          <LinePlot
            values={donations.values}
            previous={compare ? donations.previous : undefined}
            labels={donations.labels}
          />
        </div>
      </Panel>
      <Panel title="Year so far">
        <dl className="space-y-5">
          {data.yearSummary.map(([label, value]) => (
            <div className="flex justify-between" key={label}>
              <dt>
                <Small>{label}</Small>
              </dt>
              <dd className="text-xs font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
