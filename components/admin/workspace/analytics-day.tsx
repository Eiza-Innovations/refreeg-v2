"use client";

import { Small } from "@/components/marketing/Typography";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { BarPlot } from "./charts";
import { topCampaignColumns } from "./columns";
import { Panel } from "./panel";
import type { AnalyticsViewProps } from "./types";

export function AnalyticsDay({ data, onSelect }: AnalyticsViewProps) {
  const { donations } = data;
  const peak = donations.values.indexOf(Math.max(...donations.values));
  const hasGifts = donations.values.some(Boolean);
  return (
    <div className="space-y-[18px]">
      <Panel
        title="Donations by hour"
        aside={
          hasGifts && <Small>Peak {String(peak).padStart(2, "0")}:00</Small>
        }
      >
        <BarPlot
          values={donations.values}
          labels={donations.labels}
          className="h-[230px]"
        />
      </Panel>
      <Panel className="p-2">
        {data.topCampaigns.length ? (
          <DataTable
            columns={topCampaignColumns(onSelect)}
            data={data.topCampaigns}
          />
        ) : (
          <EmptyState title="No donations yet today" />
        )}
      </Panel>
    </div>
  );
}
