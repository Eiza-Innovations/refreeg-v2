import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  reportingWindow,
  type ReportingWindow,
} from "@/lib/campaign-analytics/period";
import { CAMPAIGN_ANALYTICS_TAG } from "@/lib/campaign-analytics/shared";
import { AUDIT_TAKEN_DOWN } from "@/lib/campaign-analytics/risk-levels";
import { REVIEW_REJECTED } from "@/lib/admin/review-decisions";
import { bucketSql, toSeries } from "@/lib/operations-analytics/buckets";
import {
  decisionBuckets,
  decisionOutcomes,
  queueStats,
} from "@/lib/operations-analytics/queues";
import { kycIdTypeFilterOptions } from "@/lib/options/kyc-review.options";
import type { AnalyticsPeriod } from "@/types/campaign-analytics-types";
import type {
  QueueKey,
  ReviewReport,
} from "@/types/operations-analytics-types";

type Extras = Partial<
  Pick<ReviewReport, "breakdowns" | "facts" | "series" | "seriesKind">
>;
type Rows = { label: string; value: number }[];

const TOP = 5;

async function baseReport(
  key: QueueKey,
  period: AnalyticsPeriod,
  w: ReportingWindow,
): Promise<ReviewReport> {
  const [stats, outcomes, buckets] = await Promise.all([
    queueStats(key, w),
    decisionOutcomes(key, w),
    decisionBuckets(key, period, w),
  ]);
  return {
    stats,
    approved: outcomes.approved,
    rejected: outcomes.rejected,
    previousApproved: outcomes.previousApproved,
    previousRejected: outcomes.previousRejected,
    series: toSeries(period, w, buckets),
    seriesKind: "decisions",
    breakdowns: [
      {
        title: "Decisions",
        rows: outcomes.rows
          .filter((row) => row.current > 0)
          .map((row) => ({ label: row.status, value: row.current })),
      },
    ],
    facts: [],
  };
}

const campaignExtras = async (w: ReportingWindow): Promise<Extras> => {
  const reasons = await prisma.$queryRaw<Rows>`
    SELECT LEFT(COALESCE(NULLIF(trim(c.rejection_reason), ''), 'No reason given'), 80) AS label,
      COUNT(*)::int AS value
    FROM admin_audit_entries a JOIN causes c ON c.id = a.target_id
    WHERE a.kind = 'cause' AND a.action = ${REVIEW_REJECTED}
      AND a.created_at >= ${w.from} AND a.created_at < ${w.to}
    GROUP BY 1 ORDER BY 2 DESC LIMIT ${TOP}`;
  return { breakdowns: [{ title: "Top rejection reasons", rows: reasons }] };
};

const kycExtras = async (w: ReportingWindow): Promise<Extras> => {
  const [faceMatch, idTypes, [facts]] = await Promise.all([
    prisma.$queryRaw<Rows>`
      SELECT CASE
          WHEN face_match_score IS NULL THEN 'Not scored'
          WHEN face_match_score < 60 THEN 'Below 60'
          WHEN face_match_score < 80 THEN '60–79'
          WHEN face_match_score < 90 THEN '80–89'
          ELSE '90 and up' END AS label,
        COUNT(*)::int AS value
      FROM kyc_verifications
      WHERE created_at >= ${w.from} AND created_at < ${w.to}
      GROUP BY 1 ORDER BY 2 DESC`,
    prisma.$queryRaw<Rows>`
      SELECT COALESCE(id_type, document_type) AS label, COUNT(*)::int AS value
      FROM kyc_verifications
      WHERE created_at >= ${w.from} AND created_at < ${w.to}
      GROUP BY 1 ORDER BY 2 DESC`,
    prisma.$queryRaw<{ resubmits: number; waiting_payout: number }[]>`
      SELECT
        (SELECT COUNT(*)::int FROM kyc_verifications
          WHERE status = 'resubmitted' AND updated_at >= ${w.from} AND updated_at < ${w.to}) AS resubmits,
        (SELECT COUNT(DISTINCT c.user_id)::int FROM causes c
          WHERE c.status = 'approved' AND COALESCE(c.raised, 0) > 0
            AND NOT EXISTS (
              SELECT 1 FROM kyc_verifications k
              WHERE k.user_id = c.user_id AND k.status = 'approved'
            )) AS waiting_payout`,
  ]);
  const idLabel = (value: string) =>
    kycIdTypeFilterOptions.find((option) => option.value === value)?.label ??
    value;
  return {
    breakdowns: [
      { title: "Face match score", rows: faceMatch },
      {
        title: "ID type",
        rows: idTypes.map((row) => ({ ...row, label: idLabel(row.label) })),
      },
    ],
    facts: [
      {
        label: "Resubmissions requested",
        value: facts.resubmits,
        format: "count",
      },
      {
        label: "Creators with donations but no approved KYC",
        value: facts.waiting_payout,
        format: "count",
      },
    ],
  };
};

const receiptExtras = async (w: ReportingWindow): Promise<Extras> => {
  const [row] = await prisma.$queryRaw<
    {
      claimed: number | null;
      verified: number | null;
      mismatch: number | null;
      info_requests: number;
      replies: number;
      overdue: number;
      paused: number;
    }[]
  >`
    SELECT
      SUM(amount) FILTER (WHERE status = 'approved' AND reviewed_at >= ${w.from} AND reviewed_at < ${w.to})::float8 AS claimed,
      SUM(verified_amount) FILTER (WHERE status = 'approved' AND reviewed_at >= ${w.from} AND reviewed_at < ${w.to})::float8 AS verified,
      100.0 * COUNT(*) FILTER (WHERE created_at >= ${w.from} AND created_at < ${w.to} AND read_amount IS NOT NULL AND read_amount <> amount)
        / NULLIF(COUNT(*) FILTER (WHERE created_at >= ${w.from} AND created_at < ${w.to} AND read_amount IS NOT NULL), 0) AS mismatch,
      COUNT(*) FILTER (WHERE info_requested_at >= ${w.from} AND info_requested_at < ${w.to})::int AS info_requests,
      COUNT(*) FILTER (WHERE status = 'superseded' AND info_requested_at >= ${w.from} AND info_requested_at < ${w.to})::int AS replies,
      (SELECT COUNT(*)::int FROM campaign_proof_requirements
        WHERE status = 'pending' AND deadline < now()) AS overdue,
      (SELECT COUNT(DISTINCT r.cause_id)::int FROM campaign_proof_requirements r
        JOIN causes c ON c.id = r.cause_id
        WHERE r.status = 'pending' AND r.deadline < now() AND c.compliance_paused) AS paused
    FROM campaign_proof_updates`;
  return {
    facts: [
      {
        label: "Claimed on verified receipts",
        value: row.claimed,
        format: "naira",
      },
      { label: "Verified amount", value: row.verified, format: "naira" },
      {
        label: "Receipts that differ from the claim",
        value: row.mismatch,
        format: "percent",
      },
      {
        label: "Info requests sent",
        value: row.info_requests,
        format: "count",
      },
      { label: "Creators who replied", value: row.replies, format: "count" },
      {
        label: "Proof milestones overdue now",
        value: row.overdue,
        format: "count",
      },
      {
        label: "Campaigns paused for missing proof",
        value: row.paused,
        format: "count",
      },
    ],
  };
};

const petitionExtras = async (
  period: AnalyticsPeriod,
  w: ReportingWindow,
): Promise<Extras> => {
  const [buckets, top] = await Promise.all([
    prisma.$queryRaw<{ bucket: string; count: number }[]>`
      SELECT ${bucketSql(period, Prisma.sql`created_at`)} AS bucket, COUNT(*)::int AS count
      FROM signatures
      WHERE status = 'completed' AND created_at >= ${w.from} AND created_at < ${w.to}
      GROUP BY 1`,
    prisma.$queryRaw<Rows>`
      SELECT p.title AS label, COUNT(*)::int AS value
      FROM signatures s JOIN petitions p ON p.id = s.petition_id
      WHERE s.status = 'completed' AND s.created_at >= ${w.from} AND s.created_at < ${w.to}
      GROUP BY p.id, p.title ORDER BY 2 DESC LIMIT ${TOP}`,
  ]);
  const series = toSeries(period, w, buckets);
  return {
    series,
    seriesKind: "signatures",
    breakdowns: [{ title: "Most signed this period", rows: top }],
    facts: [
      {
        label: "New signatures",
        value: series.values.reduce((total, value) => total + value, 0),
        format: "count",
      },
    ],
  };
};

const reportExtras = async (w: ReportingWindow): Promise<Extras> => {
  const [reasons, [takedowns]] = await Promise.all([
    prisma.$queryRaw<Rows>`
      SELECT reason AS label, COUNT(*)::int AS value
      FROM api_campaign_reports
      WHERE created_at >= ${w.from} AND created_at < ${w.to}
      GROUP BY 1 ORDER BY 2 DESC LIMIT ${TOP}`,
    prisma.$queryRaw<{ campaigns: number; api: number }[]>`
      SELECT
        (SELECT COUNT(*)::int FROM admin_audit_entries
          WHERE action = ${AUDIT_TAKEN_DOWN} AND created_at >= ${w.from} AND created_at < ${w.to}) AS campaigns,
        (SELECT COUNT(*)::int FROM logs
          WHERE action = 'takedown-api-campaign' AND created_at >= ${w.from} AND created_at < ${w.to}) AS api`,
  ]);
  return {
    breakdowns: [{ title: "Reports by reason", rows: reasons }],
    facts: [
      {
        label: "Campaigns taken down",
        value: takedowns.campaigns,
        format: "count",
      },
      {
        label: "API campaigns taken down",
        value: takedowns.api,
        format: "count",
      },
    ],
  };
};

async function loadReviewReport(
  key: QueueKey,
  period: AnalyticsPeriod,
): Promise<ReviewReport> {
  const w = reportingWindow(period);
  const [base, extras] = await Promise.all([
    baseReport(key, period, w),
    {
      campaigns: () => campaignExtras(w),
      kyc: () => kycExtras(w),
      receipts: () => receiptExtras(w),
      petitions: () => petitionExtras(period, w),
      reports: () => reportExtras(w),
    }[key](),
  ]);
  return {
    ...base,
    ...extras,
    breakdowns: [...base.breakdowns, ...(extras.breakdowns ?? [])],
  };
}

export const getReviewReportData = unstable_cache(
  loadReviewReport,
  ["operations-review-report"],
  { revalidate: 300, tags: [CAMPAIGN_ANALYTICS_TAG] },
);
