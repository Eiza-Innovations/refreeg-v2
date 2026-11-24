"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAdminOverview,
  type AdminOverviewData,
  type WaitingRow,
} from "@/actions/admin/admin-overview-actions";
import type {
  Metric,
  OverviewData,
  OverviewItem,
  OverviewQueue,
  Tone,
} from "@/components/admin/workspace/types";
import {
  formatChange,
  formatCount,
  formatNaira,
  initials,
} from "@/lib/admin-workspace";

const HOUR_MS = 60 * 60 * 1000;
const STALE_MS = 72 * HOUR_MS;
const ADMIN = "/dashboard/admin";

const itemPath: Record<WaitingRow["type"], (ref: string) => string> = {
  Campaign: () => `${ADMIN}/causes`,
  KYC: (ref) => `${ADMIN}/users/kyc/${ref}`,
  Receipt: (ref) => `${ADMIN}/receipts/${ref}`,
  Petition: () => `${ADMIN}/petitions`,
  Report: () => `${ADMIN}/reports`,
};

export function waitingLabel(since: Date, now: Date) {
  const hours = Math.max(
    0,
    Math.floor((now.getTime() - since.getTime()) / HOUR_MS),
  );
  if (hours < 1) return "<1h";
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const isStale = (since: Date, now: Date) =>
  now.getTime() - since.getTime() > STALE_MS;

function queueRows(raw: AdminOverviewData): OverviewQueue[] {
  const { queues, reportsOverdue } = raw;
  const now = raw.generatedAt;
  const row = (
    label: string,
    path: string,
    { count, oldest }: AdminOverviewData["queues"]["kyc"],
  ): OverviewQueue => ({
    label,
    href: `${ADMIN}${path}`,
    count,
    note: count && oldest ? `Oldest ${waitingLabel(oldest, now)}` : "All clear",
    tone:
      count && oldest && isStale(oldest, now)
        ? "gold"
        : count
          ? "neutral"
          : "green",
  });
  return [
    row("Campaigns", "/causes", queues.campaigns),
    row("KYC", "/users/kyc", queues.kyc),
    row("Receipts", "/receipts", queues.receipts),
    row("Petitions", "/petitions", queues.petitions),
    {
      ...row("Reports", "/reports", queues.reports),
      note: reportsOverdue
        ? `${reportsOverdue} over SLA`
        : queues.reports.count
          ? "On track"
          : "All clear",
      tone: reportsOverdue ? "red" : "green",
    },
  ];
}

function waitingRows(raw: AdminOverviewData): OverviewItem[] {
  const now = raw.generatedAt;
  return raw.waiting.map((item) => {
    const overdue = !!item.due_at && item.due_at < now;
    const stale = isStale(item.created_at, now);
    const tone: Tone = overdue ? "red" : stale ? "gold" : "neutral";
    return {
      id: `${item.type}-${item.ref}`,
      name: item.title,
      detail: item.detail ?? item.type,
      initials: initials(item.title),
      status: overdue ? "Over SLA" : stale ? "Waiting 3d+" : "New",
      tone,
      href: itemPath[item.type](item.ref),
      type: item.type,
      owner: item.owner ?? "Unknown user",
      waiting: waitingLabel(item.created_at, now),
    };
  });
}

export function buildOverview(raw: AdminOverviewData): OverviewData {
  const now = raw.generatedAt;
  const queues = queueRows(raw);
  const inReview = queues.reduce((sum, queue) => sum + queue.count, 0);
  const oldest = Object.values(raw.queues)
    .map((queue) => queue.oldest)
    .filter((date): date is Date => !!date);
  const { money, reportsOverdue } = raw;
  const openReports = raw.queues.reports.count;
  const change =
    money && formatChange(money.totals.total, money.totals.prev_total);

  const review: Metric = {
    label: "Items in review",
    value: formatCount(inReview),
    change: reportsOverdue ? `${reportsOverdue} over SLA` : undefined,
    tone: "red",
  };
  const reports: Metric = {
    label: "Open reports",
    value: formatCount(openReports),
    change: reportsOverdue
      ? `${reportsOverdue} overdue`
      : openReports
        ? "On track"
        : undefined,
    tone: reportsOverdue ? "red" : "green",
  };
  const active: Metric = {
    label: "Active campaigns",
    value: formatCount(raw.campaigns.active),
    change: raw.campaigns.inactive
      ? `${raw.campaigns.inactive} inactive`
      : undefined,
    tone: "gold",
  };
  const metrics: Metric[] = money
    ? [
        {
          label: "Raised this month",
          value: formatNaira(money.totals.total),
          change: change?.text,
          tone: change?.negative ? "red" : "green",
        },
        review,
        reports,
        active,
      ]
    : [
        review,
        {
          label: "Longest wait",
          value: oldest.length
            ? waitingLabel(
                new Date(Math.min(...oldest.map((d) => d.getTime()))),
                now,
              )
            : "—",
          tone: "gold",
        },
        reports,
        active,
      ];

  return {
    role: raw.role,
    generatedAt: now.toISOString(),
    label: raw.label,
    metrics,
    donations: money
      ? {
          values: money.series.values,
          previous: money.series.previous,
          labels: money.labels,
        }
      : null,
    donationsTotal: formatNaira(money?.totals.total ?? 0),
    queues,
    waiting: waitingRows(raw),
    totalWaiting: inReview,
  };
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const result = await getAdminOverview();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    select: buildOverview,
    staleTime: 60_000,
  });
}
