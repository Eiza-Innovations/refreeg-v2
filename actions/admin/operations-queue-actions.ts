"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SLA_HOURS } from "@/lib/campaign-analytics/risk-levels";
import { bucketSql } from "@/lib/operations-analytics/buckets";
import { REVIEW_APPROVED, REVIEW_REJECTED } from "@/lib/admin/review-decisions";
import type {
  AnalyticsPeriod,
  ReportingWindow,
} from "@/types/campaign-analytics-types";
import type { QueueKey, QueueStats } from "@/types/operations-analytics-types";

type QueueSource = {
  table: Prisma.Sql;
  created: Prisma.Sql;
  decidedAt: Prisma.Sql;
  waiting: Prisma.Sql;
  decided: Prisma.Sql;
  outcome: Prisma.Sql;
};

/** Causes and petitions have no reviewed-at column; first-review decisions come from the audit log. */
const reviewedTable = (table: "causes" | "petitions", kind: string) =>
  Prisma.sql`(
    SELECT t.id, t.created_at, t.status, a.created_at AS decided_at,
      CASE WHEN a.action = ${REVIEW_APPROVED} THEN 'approved' ELSE 'rejected' END AS outcome
    FROM ${Prisma.raw(table)} t
    LEFT JOIN admin_audit_entries a
      ON a.kind = ${kind} AND a.target_id = t.id
      AND a.action IN (${REVIEW_APPROVED}, ${REVIEW_REJECTED})
      AND COALESCE((a.metadata ->> 'editReview')::boolean, false) = false
  ) AS reviewed`;

const queueSources: Record<QueueKey, QueueSource> = {
  campaigns: {
    table: reviewedTable("causes", "cause"),
    created: Prisma.sql`created_at`,
    decidedAt: Prisma.sql`decided_at`,
    waiting: Prisma.sql`status = 'pending'`,
    decided: Prisma.sql`decided_at IS NOT NULL`,
    outcome: Prisma.sql`outcome`,
  },
  kyc: {
    table: Prisma.sql`kyc_verifications`,
    created: Prisma.sql`created_at`,
    decidedAt: Prisma.sql`updated_at`,
    waiting: Prisma.sql`status IN ('pending', 'in_progress', 'under_review')`,
    decided: Prisma.sql`status IN ('approved', 'rejected')`,
    outcome: Prisma.sql`status`,
  },
  receipts: {
    table: Prisma.sql`campaign_proof_updates`,
    created: Prisma.sql`created_at`,
    decidedAt: Prisma.sql`reviewed_at`,
    waiting: Prisma.sql`status = 'pending'`,
    decided: Prisma.sql`status IN ('approved', 'rejected')`,
    outcome: Prisma.sql`status`,
  },
  petitions: {
    table: reviewedTable("petitions", "petition"),
    created: Prisma.sql`created_at`,
    decidedAt: Prisma.sql`decided_at`,
    waiting: Prisma.sql`status = 'pending'`,
    decided: Prisma.sql`decided_at IS NOT NULL`,
    outcome: Prisma.sql`outcome`,
  },
  reports: {
    table: Prisma.sql`api_campaign_reports`,
    created: Prisma.sql`created_at`,
    decidedAt: Prisma.sql`resolved_at`,
    waiting: Prisma.sql`status = 'pending'`,
    decided: Prisma.sql`status <> 'pending' AND resolved_at IS NOT NULL`,
    outcome: Prisma.sql`status`,
  },
};

// Older KYC rows were decided without touching updated_at; leave them out of wait times.
const decisionTimed = (s: QueueSource) =>
  Prisma.sql`${s.decidedAt} > ${s.created}`;

const between = (column: Prisma.Sql, from: Date, to: Date) =>
  Prisma.sql`${column} >= ${from} AND ${column} < ${to}`;

export async function queueStats(
  key: QueueKey,
  w: ReportingWindow,
): Promise<QueueStats> {
  const s = queueSources[key];
  const hours = Prisma.sql`EXTRACT(EPOCH FROM ${s.decidedAt} - ${s.created}) / 3600`;
  const timed = decisionTimed(s);
  const decidedIn = (from: Date, to: Date) =>
    Prisma.sql`${s.decided} AND ${between(s.decidedAt, from, to)}`;

  const [row] = await prisma.$queryRaw<
    {
      inflow: number;
      previous_inflow: number;
      decided: number;
      previous_decided: number;
      backlog: number;
      over_sla: number;
      oldest: Date | null;
      median_hours: number | null;
      previous_median_hours: number | null;
    }[]
  >`
    SELECT
      COUNT(DISTINCT id) FILTER (WHERE ${between(s.created, w.from, w.to)})::int AS inflow,
      COUNT(DISTINCT id) FILTER (WHERE ${between(s.created, w.previousFrom, w.previousTo)})::int AS previous_inflow,
      COUNT(*) FILTER (WHERE ${decidedIn(w.from, w.to)})::int AS decided,
      COUNT(*) FILTER (WHERE ${decidedIn(w.previousFrom, w.previousTo)})::int AS previous_decided,
      COUNT(DISTINCT id) FILTER (WHERE ${s.waiting})::int AS backlog,
      COUNT(DISTINCT id) FILTER (WHERE ${s.waiting} AND ${s.created} < now() - interval '${Prisma.raw(String(SLA_HOURS))} hours')::int AS over_sla,
      MIN(${s.created}) FILTER (WHERE ${s.waiting}) AS oldest,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY ${hours}) FILTER (WHERE ${decidedIn(w.from, w.to)} AND ${timed}) AS median_hours,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY ${hours}) FILTER (WHERE ${decidedIn(w.previousFrom, w.previousTo)} AND ${timed}) AS previous_median_hours
    FROM ${s.table}`;

  return {
    key,
    inflow: row.inflow,
    previousInflow: row.previous_inflow,
    decided: row.decided,
    previousDecided: row.previous_decided,
    backlog: row.backlog,
    overSla: row.over_sla,
    oldestWaitingAt: row.oldest ? new Date(row.oldest).toISOString() : null,
    medianHours: row.median_hours == null ? null : Number(row.median_hours),
    previousMedianHours:
      row.previous_median_hours == null
        ? null
        : Number(row.previous_median_hours),
  };
}

/** Decisions per chart bucket for one queue. */
export async function decisionBuckets(
  key: QueueKey,
  period: AnalyticsPeriod,
  w: ReportingWindow,
) {
  const s = queueSources[key];
  return prisma.$queryRaw<{ bucket: string; count: number }[]>`
    SELECT ${bucketSql(period, s.decidedAt)} AS bucket, COUNT(*)::int AS count
    FROM ${s.table}
    WHERE ${s.decided} AND ${between(s.decidedAt, w.from, w.to)}
    GROUP BY 1`;
}

/** Decisions by status in the window and the one before. */
export async function decisionOutcomes(key: QueueKey, w: ReportingWindow) {
  const s = queueSources[key];
  const rows = await prisma.$queryRaw<
    { status: string; current: number; previous: number }[]
  >`
    SELECT ${s.outcome} AS status,
      COUNT(*) FILTER (WHERE ${between(s.decidedAt, w.from, w.to)})::int AS current,
      COUNT(*) FILTER (WHERE ${between(s.decidedAt, w.previousFrom, w.previousTo)})::int AS previous
    FROM ${s.table}
    WHERE ${s.decided} AND ${s.decidedAt} >= ${w.previousFrom}
    GROUP BY 1`;
  const of = (status: string) => rows.find((row) => row.status === status);
  return {
    rows,
    approved: of("approved")?.current ?? 0,
    rejected: of("rejected")?.current ?? 0,
    previousApproved: of("approved")?.previous ?? 0,
    previousRejected: of("rejected")?.previous ?? 0,
  };
}

/** Median hours from submission to decision, all time or inside a range. */
export async function medianDecisionHours(
  key: QueueKey,
  from?: Date,
  to?: Date,
) {
  const s = queueSources[key];
  const range =
    from && to
      ? Prisma.sql`AND ${between(s.decidedAt, from, to)}`
      : Prisma.empty;
  const [row] = await prisma.$queryRaw<{ hours: number | null }[]>`
    SELECT percentile_cont(0.5) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM ${s.decidedAt} - ${s.created}) / 3600
    ) AS hours
    FROM ${s.table} WHERE ${s.decided} AND ${decisionTimed(s)} ${range}`;
  return row?.hours == null ? null : Number(row.hours);
}
