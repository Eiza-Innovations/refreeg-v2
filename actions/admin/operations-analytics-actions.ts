"use server";

import { unstable_cache } from "next/cache";
import {
  decisionBuckets,
  decisionOutcomes,
  queueStats,
} from "@/actions/admin/operations-queue-actions";
import { getReportingWindow } from "@/lib/admin-analytics/period";
import { giftSeries, giftTotals } from "@/lib/admin-analytics/workspace-data";
import { requireAdminOrManager } from "@/lib/auth/admin-auth";
import { reportingWindow } from "@/lib/campaign-analytics/period";
import { SLA_HOURS } from "@/lib/campaign-analytics/risk-levels";
import { CAMPAIGN_ANALYTICS_TAG } from "@/lib/campaign-analytics/shared";
import { countBuckets, toSeries } from "@/lib/operations-analytics/buckets";
import { kycIdTypeFilterOptions } from "@/lib/options/kyc-review.options";
import { prisma } from "@/lib/prisma";
import { analyticsPeriodSchema } from "@/lib/schemas/campaign-analytics.schema";
import { queueKeySchema } from "@/lib/schemas/operations-analytics.schema";
import type {
  AnalyticsPeriod,
  ReportingWindow,
} from "@/types/campaign-analytics-types";
import type {
  AdminOverview,
  FactFormat,
  OverviewItem,
  OverviewItemStatus,
  QueueKey,
  ReviewReport,
} from "@/types/operations-analytics-types";

const CACHE_SECONDS = 300;
const HOUR_MS = 3_600_000;
const ITEM_LIMIT = 12;
const PER_QUEUE_LIMIT = 6;
const QUEUE_KEYS: QueueKey[] = [
  "campaigns",
  "kyc",
  "receipts",
  "petitions",
  "reports",
];

type Extras = {
  breakdowns: { title: string; rows: { label: string; value: number }[] }[];
  facts: { label: string; value: number | null; format: FactFormat }[];
};

const idTypeLabels = new Map<string, string>(
  kycIdTypeFilterOptions.map((o) => [o.value, o.label]),
);

function hoursWaiting(createdAt: Date | null, now = Date.now()): number {
  if (!createdAt) return 0;
  return Math.max(0, Math.round((now - createdAt.getTime()) / HOUR_MS));
}

async function campaignExtras(): Promise<Extras> {
  const [byCategory, goalAgg] = await Promise.all([
    prisma.cause.groupBy({
      by: ["category"],
      where: { status: "pending" },
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
      take: 6,
    }),
    prisma.cause.aggregate({
      where: { status: "pending" },
      _sum: { goal: true },
      _avg: { goal: true },
    }),
  ]);

  return {
    breakdowns: [
      {
        title: "Pending by category",
        rows: byCategory.map((c) => ({
          label: c.category || "Uncategorized",
          value: c._count._all,
        })),
      },
    ],
    facts: [
      {
        label: "Pending goal total",
        value: Number(goalAgg._sum.goal ?? 0),
        format: "naira",
      },
      {
        label: "Average pending goal",
        value: goalAgg._avg.goal != null ? Number(goalAgg._avg.goal) : null,
        format: "naira",
      },
    ],
  };
}

async function kycExtras(): Promise<Extras> {
  const [byIdType, faceAgg, lowMatch] = await Promise.all([
    prisma.kyc_verifications.groupBy({
      by: ["id_type"],
      where: { status: "pending" },
      _count: { _all: true },
      orderBy: { _count: { id_type: "desc" } },
    }),
    prisma.kyc_verifications.aggregate({
      where: { status: "pending", face_match_score: { not: null } },
      _avg: { face_match_score: true },
    }),
    prisma.kyc_verifications.count({
      where: { status: "pending", face_match_score: { lt: 70 } },
    }),
  ]);

  return {
    breakdowns: [
      {
        title: "Pending by ID type",
        rows: byIdType.map((r) => ({
          label:
            (r.id_type && idTypeLabels.get(r.id_type)) || r.id_type || "Other",
          value: r._count._all,
        })),
      },
    ],
    facts: [
      {
        label: "Average face match",
        value:
          faceAgg._avg.face_match_score != null
            ? Number(faceAgg._avg.face_match_score)
            : null,
        format: "percent",
      },
      {
        label: "Low face match (<70%)",
        value: lowMatch,
        format: "count",
      },
    ],
  };
}

async function receiptExtras(): Promise<Extras> {
  const pendingStatuses = { in: ["pending", "in_review"] };
  const [byStatus, pendingRows] = await Promise.all([
    prisma.campaign_proof_updates.groupBy({
      by: ["status"],
      where: { status: pendingStatuses },
      _count: { _all: true },
    }),
    prisma.campaign_proof_updates.findMany({
      where: { status: pendingStatuses },
      select: { amount: true, read_amount: true, verified_amount: true },
    }),
  ]);

  let totalAmount = 0;
  let mismatches = 0;
  for (const row of pendingRows) {
    const amt = Number(row.amount ?? 0);
    totalAmount += amt;
    if (
      (row.read_amount != null && Number(row.read_amount) !== amt) ||
      (row.verified_amount != null && Number(row.verified_amount) !== amt)
    ) {
      mismatches += 1;
    }
  }

  return {
    breakdowns: [
      {
        title: "Queue status",
        rows: byStatus.map((s) => ({
          label: s.status === "in_review" ? "In review" : "Pending",
          value: s._count._all,
        })),
      },
    ],
    facts: [
      {
        label: "Pending receipt amount",
        value: totalAmount,
        format: "naira",
      },
      {
        label: "Amount mismatches",
        value: mismatches,
        format: "count",
      },
    ],
  };
}

async function petitionExtras(w: ReportingWindow): Promise<Extras> {
  const [byCategory, sigCount, activeCount] = await Promise.all([
    prisma.petitions.groupBy({
      by: ["category"],
      where: { status: "pending" },
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
      take: 6,
    }),
    prisma.signatures.count({
      where: { created_at: { gte: w.from, lt: w.to } },
    }),
    prisma.petitions.count({ where: { status: "approved" } }),
  ]);

  return {
    breakdowns: [
      {
        title: "Pending by category",
        rows: byCategory.map((c) => ({
          label: c.category || "Uncategorized",
          value: c._count._all,
        })),
      },
    ],
    facts: [
      {
        label: "Signatures in period",
        value: sigCount,
        format: "count",
      },
      {
        label: "Active petitions",
        value: activeCount,
        format: "count",
      },
    ],
  };
}

async function reportExtras(w: ReportingWindow): Promise<Extras> {
  const [byReason, openCount, resolvedInPeriod] = await Promise.all([
    prisma.api_campaign_reports.groupBy({
      by: ["reason"],
      where: { resolved_at: null },
      _count: { _all: true },
      orderBy: { _count: { reason: "desc" } },
      take: 6,
    }),
    prisma.api_campaign_reports.count({ where: { resolved_at: null } }),
    prisma.api_campaign_reports.count({
      where: { resolved_at: { gte: w.from, lt: w.to } },
    }),
  ]);

  return {
    breakdowns: [
      {
        title: "Open reports by reason",
        rows: byReason.map((r) => ({
          label: r.reason || "Other",
          value: r._count._all,
        })),
      },
    ],
    facts: [
      { label: "Open reports", value: openCount, format: "count" },
      {
        label: "Resolved in period",
        value: resolvedInPeriod,
        format: "count",
      },
    ],
  };
}

async function loadExtras(
  queue: QueueKey,
  w: ReportingWindow,
): Promise<Extras> {
  if (queue === "campaigns") return campaignExtras();
  if (queue === "kyc") return kycExtras();
  if (queue === "receipts") return receiptExtras();
  if (queue === "petitions") return petitionExtras(w);
  return reportExtras(w);
}

const loadReviewReport = unstable_cache(
  async (queue: QueueKey, period: AnalyticsPeriod): Promise<ReviewReport> => {
    const w = reportingWindow(period);
    const [stats, outcomes, buckets, extras] = await Promise.all([
      queueStats(queue, w),
      decisionOutcomes(queue, w),
      queue === "petitions"
        ? prisma.signatures
            .findMany({
              where: { created_at: { gte: w.from, lt: w.to } },
              select: { created_at: true },
            })
            .then((rows) =>
              countBuckets(
                period,
                rows.map((r) => r.created_at),
              ),
            )
        : decisionBuckets(queue, period, w),
      loadExtras(queue, w),
    ]);

    return {
      stats,
      approved: outcomes.approved,
      rejected: outcomes.rejected,
      previousApproved: outcomes.previousApproved,
      previousRejected: outcomes.previousRejected,
      series: toSeries(period, w, buckets),
      seriesKind: queue === "petitions" ? "signatures" : "decisions",
      breakdowns: extras.breakdowns,
      facts: extras.facts,
    };
  },
  ["operations-review-report"],
  { revalidate: CACHE_SECONDS, tags: [CAMPAIGN_ANALYTICS_TAG] },
);

async function oldestItems(): Promise<OverviewItem[]> {
  const now = Date.now();
  const [causes, kycs, receipts, petitions, reports] = await Promise.all([
    prisma.cause.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      take: PER_QUEUE_LIMIT,
      select: { id: true, title: true, category: true, createdAt: true },
    }),
    prisma.kyc_verifications.findMany({
      where: { status: "pending" },
      orderBy: { created_at: "asc" },
      take: PER_QUEUE_LIMIT,
      select: {
        id: true,
        full_name: true,
        id_type: true,
        face_match_score: true,
        created_at: true,
      },
    }),
    prisma.campaign_proof_updates.findMany({
      where: { status: { in: ["pending", "in_review"] } },
      orderBy: { created_at: "asc" },
      take: PER_QUEUE_LIMIT,
      select: {
        id: true,
        status: true,
        amount: true,
        read_amount: true,
        created_at: true,
        cause: { select: { title: true } },
      },
    }),
    prisma.petitions.findMany({
      where: { status: "pending" },
      orderBy: { created_at: "asc" },
      take: PER_QUEUE_LIMIT,
      select: { id: true, title: true, category: true, created_at: true },
    }),
    prisma.api_campaign_reports.findMany({
      where: { resolved_at: null },
      orderBy: { created_at: "asc" },
      take: PER_QUEUE_LIMIT,
      select: {
        id: true,
        reason: true,
        created_at: true,
        api_campaign: { select: { title: true } },
      },
    }),
  ]);

  const items: OverviewItem[] = [];

  for (const c of causes) {
    const waitingHours = hoursWaiting(c.createdAt, now);
    items.push({
      id: c.id,
      queue: "campaigns",
      title: c.title,
      detail: c.category || "Campaign",
      waitingHours,
      status: waitingHours >= SLA_HOURS ? "over-sla" : "in-review",
      faceMatch: null,
    });
  }

  for (const k of kycs) {
    const waitingHours = hoursWaiting(k.created_at, now);
    const faceMatch =
      k.face_match_score != null ? Number(k.face_match_score) : null;
    const status: OverviewItemStatus =
      faceMatch != null && faceMatch < 70
        ? "face-match"
        : waitingHours >= SLA_HOURS
          ? "over-sla"
          : "in-review";
    items.push({
      id: k.id,
      queue: "kyc",
      title: k.full_name || "KYC Verification",
      detail: (k.id_type && idTypeLabels.get(k.id_type)) || k.id_type || "ID",
      waitingHours,
      status,
      faceMatch,
    });
  }

  for (const r of receipts) {
    const waitingHours = hoursWaiting(r.created_at, now);
    const mismatch =
      r.read_amount != null && Number(r.read_amount) !== Number(r.amount);
    const status: OverviewItemStatus = mismatch
      ? "amount-mismatch"
      : waitingHours >= SLA_HOURS
        ? "over-sla"
        : "in-review";
    items.push({
      id: r.id,
      queue: "receipts",
      title: r.cause?.title || "Proof receipt",
      detail: r.status === "in_review" ? "In review" : "Pending",
      waitingHours,
      status,
      faceMatch: null,
    });
  }

  for (const p of petitions) {
    const waitingHours = hoursWaiting(p.created_at, now);
    items.push({
      id: p.id,
      queue: "petitions",
      title: p.title,
      detail: p.category || "Petition",
      waitingHours,
      status: waitingHours >= SLA_HOURS ? "over-sla" : "in-review",
      faceMatch: null,
    });
  }

  for (const rep of reports) {
    const waitingHours = hoursWaiting(rep.created_at, now);
    items.push({
      id: rep.id,
      queue: "reports",
      title: rep.api_campaign?.title || "Reported campaign",
      detail: rep.reason || "Report",
      waitingHours,
      status: "reported",
      faceMatch: null,
    });
  }

  return items
    .sort((a, b) => b.waitingHours - a.waitingHours)
    .slice(0, ITEM_LIMIT);
}

const loadAdminOverview = unstable_cache(
  async (period: AnalyticsPeriod): Promise<AdminOverview> => {
    const w = reportingWindow(period);
    const aw = getReportingWindow(period);

    const [totals, series, activeCampaigns, newCampaigns, queues, items] =
      await Promise.all([
        giftTotals(aw),
        giftSeries(aw),
        prisma.cause.count({ where: { status: "approved" } }),
        prisma.cause.count({
          where: { createdAt: { gte: w.from, lt: w.to } },
        }),
        Promise.all(
          QUEUE_KEYS.map(async (key) => {
            const s = await queueStats(key, w);
            return {
              key: s.key,
              backlog: s.backlog,
              overSla: s.overSla,
              oldestWaitingAt: s.oldestWaitingAt,
            };
          }),
        ),
        oldestItems(),
      ]);

    return {
      raised: totals.total,
      previousRaised: totals.prev_total,
      activeCampaigns,
      newCampaigns,
      donations: { values: series.values, labels: aw.labels },
      queues,
      items,
    };
  },
  ["operations-admin-overview"],
  { revalidate: CACHE_SECONDS, tags: [CAMPAIGN_ANALYTICS_TAG] },
);

export async function getReviewReport(
  queue: QueueKey,
  period: AnalyticsPeriod,
) {
  await requireAdminOrManager();
  try {
    const validQueue = queueKeySchema.parse(queue);
    const validPeriod = analyticsPeriodSchema.parse(period);
    const data = await loadReviewReport(validQueue, validPeriod);
    return { data, error: null };
  } catch (error) {
    console.error("Failed to load review report:", error);
    return {
      data: null,
      error: "Unable to load review report right now.",
    };
  }
}

export async function getAdminOverview(period: AnalyticsPeriod) {
  await requireAdminOrManager();
  try {
    const validPeriod = analyticsPeriodSchema.parse(period);
    const data = await loadAdminOverview(validPeriod);
    return { data, error: null };
  } catch (error) {
    console.error("Failed to load admin overview:", error);
    return {
      data: null,
      error: "Unable to load admin overview right now.",
    };
  }
}
