"use client";

import { Info, TriangleAlert } from "lucide-react";
import { Small } from "@/components/marketing/Typography";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { AmbassadorsView } from "./ambassadors-view";
import { Chip } from "./chip";
import { Panel } from "./panel";
import { Donut, Breakdown, LinePlot } from "./charts";
import type { WorkspaceData, WorkspaceView } from "./types";

export function DetailContent({
  view,
  data,
}: {
  view: WorkspaceView;
  data: WorkspaceData;
}) {
  if (view === "ambassadors") return <AmbassadorsView data={data} />;

  if (view === "eiza")
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Issued by source" aside={<Small>{data.label}</Small>}>
          {data.eiza.segments.length ? (
            <Donut
              size={180}
              total={data.eiza.total}
              caption="EIZA"
              segments={data.eiza.segments}
            />
          ) : (
            <EmptyState title="No EIZA issued in this period" />
          )}
        </Panel>
        <Panel title="Who holds EIZA" aside={<Small>% of all balances</Small>}>
          <Breakdown rows={data.holders.rows} />
          <CalloutBanner
            variant={data.holders.top100Share >= 50 ? "gold" : "neutral"}
            icon={
              data.holders.top100Share >= 50 ? (
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )
            }
            title={`The top 100 holders hold ${data.holders.top100Share}% of all EIZA.`}
            className="mt-4 border-0 text-xs leading-5 [&_p]:font-normal"
          />
        </Panel>
      </div>
    );

  const { userActivity } = data;
  return (
    <div className="grid gap-4 xl:grid-cols-[1.14fr_1fr]">
      <Panel
        title="New vs returning"
        className="min-h-[329px]"
        aside={
          <div className="flex gap-1.5">
            <Chip tone="blue" dot>
              Returning
            </Chip>
            <Chip tone="green" dot>
              New
            </Chip>
          </div>
        }
      >
        <div className="[&_svg]:h-[245px]">
          <LinePlot
            values={userActivity.returning}
            secondary={userActivity.new}
            labels={userActivity.labels}
          />
        </div>
      </Panel>
      <Panel
        title="Retention by sign-up month"
        aside={<Small>% still active</Small>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] border-separate border-spacing-[3px] text-center text-xs">
            <caption className="sr-only">
              Monthly cohort retention percentages
            </caption>
            <thead>
              <tr>
                <th aria-label="Cohort month" />
                {[1, 2, 3, 4, 5, 6].map((v) => (
                  <th
                    key={v}
                    scope="col"
                    className="pb-1 text-[10px] font-semibold text-ink/60"
                  >
                    M{v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="pr-10 text-left font-normal">
                    {row.label}
                  </th>
                  {row.values.map((value, j) =>
                    value === null ? (
                      <td key={j} />
                    ) : (
                      <td
                        key={j}
                        className="h-[31px] min-w-[48px] rounded-md font-medium"
                        style={{
                          backgroundColor: `hsl(var(--forest) / ${value / 100})`,
                          color:
                            value > 45
                              ? "hsl(var(--surface))"
                              : "hsl(var(--ink))",
                        }}
                      >
                        {value}%
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
