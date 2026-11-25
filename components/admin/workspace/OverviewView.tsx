"use client";

import {
  ArrowDownToLine,
  CalendarDays,
  Contact,
  Flag,
  Heart,
  ReceiptText,
  RefreshCw,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminOverview } from "@/hooks/use-operations-analytics";
import { downloadCsv } from "@/lib/download-csv";
import {
  formatChange,
  formatCount,
  formatNaira,
  initials,
} from "@/lib/admin-workspace";
import {
  overviewItemTypeOptions,
  overviewQueueOptions,
} from "@/lib/options/admin-overview.options";
import { cn } from "@/lib/utils";
import type {
  AdminOverview,
  OverviewItem,
  QueueKey,
} from "@/types/operations-analytics-types";
import { LinePlot } from "./charts";
import { PeriodSwitch } from "./PeriodSwitch";
import { Chip } from "./chip";
import { MetricCards } from "./metric-cards";
import { Panel } from "./panel";
import { Person } from "./person";
import type { Metric, Period, Tone } from "./types";
import { WorkspacePageHeader } from "./WorkspacePageHeader";

const SLA_HOURS = 24;
const queueIcons: Record<QueueKey, typeof Heart> = {
  campaigns: Heart,
  kyc: Contact,
  receipts: ReceiptText,
  petitions: Trophy,
  reports: Flag,
};
const statusChip: Record<
  OverviewItem["status"],
  { tone: Tone; label: (item: OverviewItem) => string }
> = {
  "over-sla": { tone: "red", label: () => "Over SLA" },
  "in-review": { tone: "neutral", label: () => "In review" },
  "face-match": {
    tone: "red",
    label: (item) => `Face match ${item.faceMatch}%`,
  },
  "amount-mismatch": { tone: "red", label: () => "Amount mismatch" },
  reported: { tone: "gold", label: () => "Reported" },
};
const periodNoun: Record<Period, string> = {
  day: "today",
  month: "this month",
  year: "this year",
};

const labelOf = (
  options: readonly { label: string; value: string }[],
  value: string,
) => options.find((option) => option.value === value)?.label ?? value;
const waited = (hours: number) =>
  hours < 48 ? `${Math.round(hours)}h` : `${Math.round(hours / 24)}d`;

function greeting(generatedAt: string, firstName: string) {
  const at = new Date(generatedAt);
  const hour = Number(
    at.toLocaleString("en-NG", {
      hour: "numeric",
      hour12: false,
      timeZone: "Africa/Lagos",
    }),
  );
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const date = at.toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Lagos",
  });
  return { title: `Good ${part}, ${firstName}`, date };
}

function overviewMetrics(data: AdminOverview, period: Period): Metric[] {
  const waiting = data.queues.reduce(
    (total, queue) => total + queue.backlog,
    0,
  );
  const overSla = data.queues.reduce(
    (total, queue) => total + queue.overSla,
    0,
  );
  const change = formatChange(data.raised, data.previousRaised);
  return [
    {
      label: `Raised ${periodNoun[period]}`,
      value: formatNaira(data.raised),
      change: change?.text,
      tone: change?.negative ? "red" : "green",
    },
    {
      label: "Items in review",
      value: formatCount(waiting),
      change: overSla ? `${overSla} over SLA` : "On track",
      tone: overSla ? "red" : "green",
    },
    {
      label: "Awaiting release",
      value: "—",
      change: "not tracked yet",
      tone: "neutral",
    },
    {
      label: "Active campaigns",
      value: formatCount(data.activeCampaigns),
      change: `+${formatCount(data.newCampaigns)} new`,
      tone: "green",
    },
  ];
}

export function OverviewView({
  period,
  onPeriod,
  firstName,
  generatedAt,
  onOpenQueue,
}: {
  period: Period;
  onPeriod: (period: Period) => void;
  firstName: string;
  generatedAt: string;
  onOpenQueue: (queue: QueueKey) => void;
}) {
  const overview = useAdminOverview(period);
  const data = overview.data;
  const head = greeting(generatedAt, firstName);
  const waiting = data?.queues.reduce(
    (total, queue) => total + queue.backlog,
    0,
  );
  const metrics = data ? overviewMetrics(data, period) : null;

  const handleExport = () => {
    if (!data || !metrics) return;
    downloadCsv(
      `overview-${period}`,
      ["Section", "Item", "Value", "Note"],
      [
        ...metrics.map((metric) => [
          "Summary",
          metric.label,
          metric.value,
          metric.change ?? "",
        ]),
        ...data.queues.map((queue) => [
          "Queues",
          labelOf(overviewQueueOptions, queue.key),
          queue.backlog,
          `${queue.overSla} over SLA`,
        ]),
        ...data.items.map((item) => [
          labelOf(overviewItemTypeOptions, item.queue),
          item.title,
          waited(item.waitingHours),
          statusChip[item.status].label(item),
        ]),
      ],
    );
  };

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        title={head.title}
        subtitle={
          waiting == null
            ? `${head.date} · loading the latest numbers…`
            : `${head.date} · ${waiting} items waiting across all queues`
        }
        actions={
          <>
            <span className="inline-flex h-10 items-center gap-2 rounded-md border border-hairline bg-surface px-4 text-sm font-medium text-ink">
              <CalendarDays className="h-4 w-4" />
              {period === "day" ? "Today" : `This ${period}`}
            </span>
            <Button
              variant="ink"
              className="gap-2"
              disabled={!data}
              onClick={handleExport}
            >
              <ArrowDownToLine className="h-4 w-4" /> Export
            </Button>
          </>
        }
      />

      {overview.error ? (
        <Panel className="flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rust/10 text-rust">
            <TriangleAlert className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-sm font-semibold">
            Overview data didn&rsquo;t load
          </h2>
          <p className="mt-2 max-w-sm text-xs leading-5 text-ink/60">
            {overview.error}
          </p>
          <Button
            variant="ink"
            size="sm"
            className="mt-5 gap-2"
            onClick={() => overview.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </Button>
        </Panel>
      ) : (
        <>
          <MetricCards
            metrics={
              metrics ??
              Array.from({ length: 4 }, (_, index) => ({
                label: String(index),
                value: "",
              }))
            }
            loading={!data}
          />

          <div className="grid gap-4 xl:grid-cols-[1.78fr_1fr]">
            <Panel
              title="Donations"
              aside={<PeriodSwitch period={period} onChange={onPeriod} />}
            >
              {!data ? (
                <Skeleton className="h-[200px] w-full bg-ink/[0.06]" />
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <strong className="text-[22px] tabular-nums">
                      {formatNaira(data.raised)}
                    </strong>
                    {metrics?.[0].change && (
                      <Chip tone={metrics[0].tone}>{metrics[0].change}</Chip>
                    )}
                  </div>
                  <div className="[&_svg]:h-[170px]">
                    <LinePlot
                      area
                      values={data.donations.values}
                      labels={data.donations.labels}
                    />
                  </div>
                </>
              )}
            </Panel>

            <Panel
              title="Queues"
              aside={
                <span className="text-xs text-ink/60">SLA {SLA_HOURS}h</span>
              }
            >
              {!data ? (
                <Skeleton className="h-[200px] w-full bg-ink/[0.06]" />
              ) : (
                <ul className="divide-y divide-hairline">
                  {data.queues.map((queue) => {
                    const Icon = queueIcons[queue.key];
                    return (
                      <li key={queue.key}>
                        <button
                          type="button"
                          onClick={() => onOpenQueue(queue.key)}
                          className="flex w-full items-center gap-3 py-2.5 text-left text-[13px] hover:bg-ink/[0.02]"
                        >
                          <Icon className="h-4 w-4 shrink-0 stroke-[1.5] text-ink/60" />
                          <span className="flex-1">
                            {labelOf(overviewQueueOptions, queue.key)}
                          </span>
                          <Chip tone={queue.overSla ? "red" : "green"} dot>
                            {queue.overSla
                              ? `${queue.overSla} over SLA`
                              : "On track"}
                          </Chip>
                          <strong className="w-8 text-right tabular-nums">
                            {queue.backlog}
                          </strong>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          <Panel className="overflow-hidden p-0">
            <table className="workspace-table w-full">
              <thead>
                <tr>
                  {["Item", "Type", "Owner", "Waiting", "Status"].map(
                    (label) => (
                      <th className="text-left" key={label}>
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {!data ? (
                  Array.from({ length: 4 }, (_, index) => (
                    <tr key={index}>
                      <td colSpan={5}>
                        <Skeleton className="h-6 w-full bg-ink/[0.06]" />
                      </td>
                    </tr>
                  ))
                ) : data.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-xs text-ink/60"
                    >
                      Nothing is waiting. New submissions land here.
                    </td>
                  </tr>
                ) : (
                  data.items.map((item) => {
                    const chip = statusChip[item.status];
                    return (
                      <tr
                        key={`${item.queue}-${item.id}`}
                        className="border-b last:border-0"
                      >
                        <td>
                          <button
                            type="button"
                            className="text-left"
                            onClick={() => onOpenQueue(item.queue)}
                          >
                            <Person
                              name={item.title}
                              detail={item.detail}
                              initials={initials(item.title)}
                            />
                          </button>
                        </td>
                        <td className="text-ink/70">
                          {labelOf(overviewItemTypeOptions, item.queue)}
                        </td>
                        <td className="text-ink/50">Unassigned</td>
                        <td
                          className={cn(
                            "font-semibold",
                            item.waitingHours > SLA_HOURS && "text-rust",
                          )}
                        >
                          {waited(item.waitingHours)}
                        </td>
                        <td>
                          <Chip tone={chip.tone} dot>
                            {chip.label(item)}
                          </Chip>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Panel>
        </>
      )}
    </div>
  );
}
