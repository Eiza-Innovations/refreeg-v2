"use client";

import Link from "next/link";
import { ArrowDownToLine } from "lucide-react";
import { Small, Span, Strong } from "@/components/marketing/Typography";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LinePlot } from "@/components/admin/workspace/charts";
import { Chip } from "@/components/admin/workspace/chip";
import { MetricCards } from "@/components/admin/workspace/metric-cards";
import { PageHeading } from "@/components/admin/workspace/page-heading";
import { Panel } from "@/components/admin/workspace/panel";
import { WorkspaceFrame } from "@/components/admin/workspace/workspace-frame";
import type { OverviewData } from "@/components/admin/workspace/types";
import { downloadCsv } from "@/lib/admin-workspace";
import { waitingColumns } from "./columns";

export function OverviewContent({
  data,
  greeting,
  dateLine,
}: {
  data: OverviewData;
  greeting: string;
  dateLine: string;
}) {
  const exportOverview = () =>
    downloadCsv(
      [
        ["Range", data.label],
        ["Generated", data.generatedAt],
        ["Metric", "Value", "Change"],
        ...data.metrics.map((m) => [m.label, m.value, m.change ?? ""]),
        [],
        ["Queue", "Waiting", "Note"],
        ...data.queues.map((q) => [q.label, q.count, q.note]),
      ],
      `refreeg-overview-${data.generatedAt.slice(0, 10)}.csv`,
    );

  return (
    <WorkspaceFrame className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <PageHeading
          title={greeting}
          subtitle={`${dateLine} · ${data.totalWaiting} item${data.totalWaiting === 1 ? "" : "s"} waiting across all queues`}
        />
        <div className="flex items-center gap-2">
          <Chip tone="neutral">{data.label}</Chip>
          <Button variant="ink" className="gap-2" onClick={exportOverview}>
            <ArrowDownToLine className="h-4 w-4" /> Export
          </Button>
        </div>
      </header>

      <MetricCards metrics={data.metrics} />

      <div
        className={
          data.donations ? "grid gap-4 xl:grid-cols-[1.78fr_1fr]" : "grid gap-4"
        }
      >
        {data.donations && (
          <Panel
            title="Donations"
            aside={
              <div className="flex gap-1.5">
                <Chip tone="blue" dot>
                  This month
                </Chip>
                <Chip tone="neutral" dot>
                  Last month
                </Chip>
              </div>
            }
          >
            <Strong className="block text-2xl tabular-nums">
              {data.donationsTotal}
            </Strong>
            <div className="mt-3 [&_svg]:h-[200px]">
              <LinePlot
                area
                values={data.donations.values}
                previous={data.donations.previous}
                labels={data.donations.labels}
              />
            </div>
          </Panel>
        )}
        <Panel title="Queues" aside={<Small>Pending review</Small>}>
          <ul className="divide-y divide-hairline">
            {data.queues.map((queue) => (
              <li key={queue.label}>
                <Link
                  href={queue.href}
                  className="flex items-center justify-between gap-3 py-3 text-sm hover:opacity-80"
                >
                  <Span className="font-medium">{queue.label}</Span>
                  <span className="flex items-center gap-3">
                    <Chip tone={queue.tone} dot>
                      {queue.note}
                    </Chip>
                    <Strong className="w-6 text-right tabular-nums">
                      {queue.count}
                    </Strong>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="p-2">
        {data.waiting.length ? (
          <DataTable columns={waitingColumns} data={data.waiting} />
        ) : (
          <EmptyState
            title="Nothing is waiting for review"
            description="New campaigns, KYC checks, receipts, petitions and reports appear here."
          />
        )}
      </Panel>
    </WorkspaceFrame>
  );
}
