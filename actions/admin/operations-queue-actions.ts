"use server";

import { requireAdminOrManager } from "@/lib/auth/admin-auth";
import { REVIEW_APPROVED, REVIEW_REJECTED } from "@/lib/admin/review-decisions";
import { SLA_HOURS } from "@/lib/campaign-analytics/risk-levels";
import { countBuckets } from "@/lib/operations-analytics/buckets";
import { prisma } from "@/lib/prisma";
import type {
  AnalyticsPeriod,
  ReportingWindow,
} from "@/types/campaign-analytics-types";
import type { QueueKey, QueueStats } from "@/types/operations-analytics-types";

const HOUR_MS = 3_600_000;
const REVIEW_ACTIONS = [REVIEW_APPROVED, REVIEW_REJECTED];

type FirstReview = {
  targetId: string;
  action: string;
  decidedAt: Date;
};

type DecisionOutcomeResult = {
  rows: { status: string; current: number; previous: number }[];
  approved: number;
  rejected: number;
  previousApproved: number;
  previousRejected: number;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function inRange(date: Date, from: Date, to: Date): boolean {
  return date >= from && date < to;
}

function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / HOUR_MS;
}

async function firstAuditReviews(
  kind: "cause" | "petition",
): Promise<FirstReview[]> {
  const entries = await prisma.admin_audit_entries.findMany({
    where: { kind, action: { in: REVIEW_ACTIONS } },
    select: { target_id: true, action: true, created_at: true },
    orderBy: { created_at: "asc" },
  });

  const seen = new Set<string>();
  const firsts: FirstReview[] = [];
  for (const entry of entries) {
    if (!entry.target_id || seen.has(entry.target_id)) continue;
    seen.add(entry.target_id);
    firsts.push({
      targetId: entry.target_id,
      action: entry.action,
      decidedAt: entry.created_at,
    });
  }
  return firsts;
}

async function aggregatePending(
  countAll: () => Promise<number>,
  countOverSla: () => Promise<number>,
  oldestDate: () => Promise<Date | null>,
) {
  const [backlog, overSla, oldest] = await Promise.all([
    countAll(),
    countOverSla(),
    oldestDate(),
  ]);
  return {
    backlog,
    overSla,
    oldestWaitingAt: oldest ? oldest.toISOString() : null,
  };
}

export async function medianDecisionHours(
  key: QueueKey,
  from?: Date,
  to?: Date,
): Promise<number | null> {
  await requireAdminOrManager();

  const matchesWindow = (d: Date) => (!from || d >= from) && (!to || d < to);
  const dateFilter =
    from || to
      ? { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) }
      : undefined;

  if (key === "campaigns" || key === "petitions") {
    const kind = key === "campaigns" ? "cause" : "petition";
    const reviews = (await firstAuditReviews(kind)).filter((r) =>
      matchesWindow(r.decidedAt),
    );
    if (reviews.length === 0) return null;
    const ids = reviews.map((r) => r.targetId);

    const createdMap = new Map<string, Date>();
    if (key === "campaigns") {
      const rows = await prisma.cause.findMany({
        where: { id: { in: ids } },
        select: { id: true, createdAt: true },
      });
      for (const row of rows) {
        if (row.createdAt) createdMap.set(row.id, row.createdAt);
      }
    } else {
      const rows = await prisma.petitions.findMany({
        where: { id: { in: ids } },
        select: { id: true, created_at: true },
      });
      for (const row of rows) createdMap.set(row.id, row.created_at);
    }

    const hours = reviews.flatMap((r) => {
      const created = createdMap.get(r.targetId);
      return created && r.decidedAt > created
        ? [hoursBetween(created, r.decidedAt)]
        : [];
    });
    return median(hours);
  }

  if (key === "kyc") {
    const rows = await prisma.kyc_verifications.findMany({
      where: {
        status: { in: ["approved", "rejected"] },
        ...(dateFilter ? { updated_at: dateFilter } : {}),
      },
      select: { created_at: true, updated_at: true },
    });
    // Older KYC rows were decided without touching updated_at; leave them out of wait times.
    const hours = rows.flatMap((r) =>
      r.updated_at && r.created_at && r.updated_at > r.created_at
        ? [hoursBetween(r.created_at, r.updated_at)]
        : [],
    );
    return median(hours);
  }

  if (key === "receipts") {
    const rows = await prisma.campaign_proof_updates.findMany({
      where: {
        reviewed_at: dateFilter ?? { not: null },
      },
      select: { created_at: true, reviewed_at: true },
    });
    const hours = rows.flatMap((r) =>
      r.reviewed_at && r.created_at && r.reviewed_at > r.created_at
        ? [hoursBetween(r.created_at, r.reviewed_at)]
        : [],
    );
    return median(hours);
  }

  const rows = await prisma.api_campaign_reports.findMany({
    where: {
      resolved_at: dateFilter ?? { not: null },
    },
    select: { created_at: true, resolved_at: true },
  });
  const hours = rows.flatMap((r) =>
    r.resolved_at && r.created_at && r.resolved_at > r.created_at
      ? [hoursBetween(r.created_at, r.resolved_at)]
      : [],
  );
  return median(hours);
}

export async function queueStats(
  key: QueueKey,
  w: ReportingWindow,
): Promise<QueueStats> {
  await requireAdminOrManager();

  const slaCutoff = new Date(Date.now() - SLA_HOURS * HOUR_MS);
  const currentRange = { gte: w.from, lt: w.to };
  const previousRange = { gte: w.previousFrom, lt: w.previousTo };

  const [medianHours, previousMedianHours] = await Promise.all([
    medianDecisionHours(key, w.from, w.to),
    medianDecisionHours(key, w.previousFrom, w.previousTo),
  ]);

  if (key === "campaigns" || key === "petitions") {
    const kind = key === "campaigns" ? "cause" : "petition";
    const [reviews, inflow, previousInflow, pending] = await Promise.all([
      firstAuditReviews(kind),
      key === "campaigns"
        ? prisma.cause.count({ where: { createdAt: currentRange } })
        : prisma.petitions.count({ where: { created_at: currentRange } }),
      key === "campaigns"
        ? prisma.cause.count({ where: { createdAt: previousRange } })
        : prisma.petitions.count({ where: { created_at: previousRange } }),
      key === "campaigns"
        ? aggregatePending(
            () => prisma.cause.count({ where: { status: "pending" } }),
            () =>
              prisma.cause.count({
                where: { status: "pending", createdAt: { lt: slaCutoff } },
              }),
            async () =>
              (
                await prisma.cause.aggregate({
                  where: { status: "pending" },
                  _min: { createdAt: true },
                })
              )._min.createdAt,
          )
        : aggregatePending(
            () => prisma.petitions.count({ where: { status: "pending" } }),
            () =>
              prisma.petitions.count({
                where: { status: "pending", created_at: { lt: slaCutoff } },
              }),
            async () =>
              (
                await prisma.petitions.aggregate({
                  where: { status: "pending" },
                  _min: { created_at: true },
                })
              )._min.created_at,
          ),
    ]);

    return {
      key,
      inflow,
      previousInflow,
      decided: reviews.filter((r) => inRange(r.decidedAt, w.from, w.to)).length,
      previousDecided: reviews.filter((r) =>
        inRange(r.decidedAt, w.previousFrom, w.previousTo),
      ).length,
      ...pending,
      medianHours,
      previousMedianHours,
    };
  }

  if (key === "kyc") {
    const decidedStatuses = { in: ["approved", "rejected"] };
    const [inflow, previousInflow, decided, previousDecided, pending] =
      await Promise.all([
        prisma.kyc_verifications.count({ where: { created_at: currentRange } }),
        prisma.kyc_verifications.count({
          where: { created_at: previousRange },
        }),
        prisma.kyc_verifications.count({
          where: { status: decidedStatuses, updated_at: currentRange },
        }),
        prisma.kyc_verifications.count({
          where: { status: decidedStatuses, updated_at: previousRange },
        }),
        aggregatePending(
          () =>
            prisma.kyc_verifications.count({ where: { status: "pending" } }),
          () =>
            prisma.kyc_verifications.count({
              where: { status: "pending", created_at: { lt: slaCutoff } },
            }),
          async () =>
            (
              await prisma.kyc_verifications.aggregate({
                where: { status: "pending" },
                _min: { created_at: true },
              })
            )._min.created_at,
        ),
      ]);

    return {
      key,
      inflow,
      previousInflow,
      decided,
      previousDecided,
      ...pending,
      medianHours,
      previousMedianHours,
    };
  }

  if (key === "receipts") {
    const pendingStatuses = { in: ["pending", "in_review"] };
    const [inflow, previousInflow, decided, previousDecided, pending] =
      await Promise.all([
        prisma.campaign_proof_updates.count({
          where: { created_at: currentRange },
        }),
        prisma.campaign_proof_updates.count({
          where: { created_at: previousRange },
        }),
        prisma.campaign_proof_updates.count({
          where: { reviewed_at: currentRange },
        }),
        prisma.campaign_proof_updates.count({
          where: { reviewed_at: previousRange },
        }),
        aggregatePending(
          () =>
            prisma.campaign_proof_updates.count({
              where: { status: pendingStatuses },
            }),
          () =>
            prisma.campaign_proof_updates.count({
              where: {
                status: pendingStatuses,
                created_at: { lt: slaCutoff },
              },
            }),
          async () =>
            (
              await prisma.campaign_proof_updates.aggregate({
                where: { status: pendingStatuses },
                _min: { created_at: true },
              })
            )._min.created_at,
        ),
      ]);

    return {
      key,
      inflow,
      previousInflow,
      decided,
      previousDecided,
      ...pending,
      medianHours,
      previousMedianHours,
    };
  }

  const [inflow, previousInflow, decided, previousDecided, pending] =
    await Promise.all([
      prisma.api_campaign_reports.count({
        where: { created_at: currentRange },
      }),
      prisma.api_campaign_reports.count({
        where: { created_at: previousRange },
      }),
      prisma.api_campaign_reports.count({
        where: { resolved_at: currentRange },
      }),
      prisma.api_campaign_reports.count({
        where: { resolved_at: previousRange },
      }),
      aggregatePending(
        () =>
          prisma.api_campaign_reports.count({ where: { resolved_at: null } }),
        () =>
          prisma.api_campaign_reports.count({
            where: { resolved_at: null, created_at: { lt: slaCutoff } },
          }),
        async () =>
          (
            await prisma.api_campaign_reports.aggregate({
              where: { resolved_at: null },
              _min: { created_at: true },
            })
          )._min.created_at,
      ),
    ]);

  return {
    key,
    inflow,
    previousInflow,
    decided,
    previousDecided,
    ...pending,
    medianHours,
    previousMedianHours,
  };
}

export async function decisionBuckets(
  key: QueueKey,
  period: AnalyticsPeriod,
  w: ReportingWindow,
): Promise<{ bucket: string; count: number }[]> {
  await requireAdminOrManager();

  const range = { gte: w.from, lt: w.to };

  if (key === "campaigns" || key === "petitions") {
    const kind = key === "campaigns" ? "cause" : "petition";
    const reviews = await firstAuditReviews(kind);
    return countBuckets(
      period,
      reviews
        .filter((r) => inRange(r.decidedAt, w.from, w.to))
        .map((r) => r.decidedAt),
    );
  }

  if (key === "kyc") {
    const rows = await prisma.kyc_verifications.findMany({
      where: { status: { in: ["approved", "rejected"] }, updated_at: range },
      select: { updated_at: true },
    });
    return countBuckets(
      period,
      rows.flatMap((r) => (r.updated_at ? [r.updated_at] : [])),
    );
  }

  if (key === "receipts") {
    const rows = await prisma.campaign_proof_updates.findMany({
      where: { reviewed_at: range },
      select: { reviewed_at: true },
    });
    return countBuckets(
      period,
      rows.flatMap((r) => (r.reviewed_at ? [r.reviewed_at] : [])),
    );
  }

  const rows = await prisma.api_campaign_reports.findMany({
    where: { resolved_at: range },
    select: { resolved_at: true },
  });
  return countBuckets(
    period,
    rows.flatMap((r) => (r.resolved_at ? [r.resolved_at] : [])),
  );
}

export async function decisionOutcomes(
  key: QueueKey,
  w: ReportingWindow,
): Promise<DecisionOutcomeResult> {
  await requireAdminOrManager();

  const currentRange = { gte: w.from, lt: w.to };
  const previousRange = { gte: w.previousFrom, lt: w.previousTo };

  if (key === "campaigns" || key === "petitions") {
    const kind = key === "campaigns" ? "cause" : "petition";
    const reviews = await firstAuditReviews(kind);
    const current = reviews.filter((r) => inRange(r.decidedAt, w.from, w.to));
    const previous = reviews.filter((r) =>
      inRange(r.decidedAt, w.previousFrom, w.previousTo),
    );

    const approved = current.filter((r) => r.action === REVIEW_APPROVED).length;
    const rejected = current.filter((r) => r.action === REVIEW_REJECTED).length;
    const previousApproved = previous.filter(
      (r) => r.action === REVIEW_APPROVED,
    ).length;
    const previousRejected = previous.filter(
      (r) => r.action === REVIEW_REJECTED,
    ).length;

    return {
      rows: [
        { status: "approved", current: approved, previous: previousApproved },
        { status: "rejected", current: rejected, previous: previousRejected },
      ],
      approved,
      rejected,
      previousApproved,
      previousRejected,
    };
  }

  const groupOutcome = async (
    fetchCounts: (range: {
      gte: Date;
      lt: Date;
    }) => Promise<{ status: string; count: number }[]>,
    approvedStatuses: string[],
    rejectedStatuses: string[],
  ): Promise<DecisionOutcomeResult> => {
    const [curRows, prevRows] = await Promise.all([
      fetchCounts(currentRange),
      fetchCounts(previousRange),
    ]);
    const map = new Map<string, { current: number; previous: number }>();
    for (const r of curRows) {
      map.set(r.status, { current: r.count, previous: 0 });
    }
    for (const r of prevRows) {
      const existing = map.get(r.status) ?? { current: 0, previous: 0 };
      existing.previous = r.count;
      map.set(r.status, existing);
    }
    const rows = Array.from(map.entries()).map(([status, counts]) => ({
      status,
      ...counts,
    }));
    const sumFor = (statuses: string[], pick: "current" | "previous") =>
      rows
        .filter((r) => statuses.includes(r.status))
        .reduce((acc, r) => acc + r[pick], 0);

    return {
      rows,
      approved: sumFor(approvedStatuses, "current"),
      rejected: sumFor(rejectedStatuses, "current"),
      previousApproved: sumFor(approvedStatuses, "previous"),
      previousRejected: sumFor(rejectedStatuses, "previous"),
    };
  };

  if (key === "kyc") {
    return groupOutcome(
      async (range) => {
        const grouped = await prisma.kyc_verifications.groupBy({
          by: ["status"],
          where: {
            status: { in: ["approved", "rejected"] },
            updated_at: range,
          },
          _count: { _all: true },
        });
        return grouped.map((g) => ({ status: g.status, count: g._count._all }));
      },
      ["approved"],
      ["rejected"],
    );
  }

  if (key === "receipts") {
    return groupOutcome(
      async (range) => {
        const grouped = await prisma.campaign_proof_updates.groupBy({
          by: ["status"],
          where: { reviewed_at: range },
          _count: { _all: true },
        });
        return grouped.map((g) => ({ status: g.status, count: g._count._all }));
      },
      ["approved"],
      ["rejected"],
    );
  }

  return groupOutcome(
    async (range) => {
      const grouped = await prisma.api_campaign_reports.groupBy({
        by: ["status"],
        where: { resolved_at: range },
        _count: { _all: true },
      });
      return grouped.map((g) => ({ status: g.status, count: g._count._all }));
    },
    ["resolved", "action_taken"],
    ["dismissed"],
  );
}
