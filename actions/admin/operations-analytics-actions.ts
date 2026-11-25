"use server";

import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import {
  decisionBuckets,
  decisionOutcomes,
  queueStats,
} from "@/actions/admin/operations-queue-actions";
import { prisma } from "@/lib/prisma";
import { getReportingWindow } from "@/lib/admin-analytics/period";
import { giftSeries, giftTotals } from "@/lib/admin-analytics/workspace-data";
import { reportingWindow } from "@/lib/campaign-analytics/period";
import { CAMPAIGN_ANALYTICS_TAG } from "@/lib/campaign-analytics/shared";
import {
  AUDIT_TAKEN_DOWN,
  SLA_HOURS,
} from "@/lib/campaign-analytics/risk-levels";
import { REVIEW_REJECTED } from "@/lib/admin/review-decisions";
import { bucketSql, toSeries } from "@/lib/operations-analytics/buckets";
import { kycIdTypeFilterOptions } from "@/lib/options/kyc-review.options";
import { analyticsPeriodSchema } from "@/lib/schemas/campaign-analytics.schema";
import { queueKeySchema } from "@/lib/schemas/operations-analytics.schema";
import type {
  AnalyticsPeriod,
  ReportingWindow,
} from "@/types/campaign-analytics-types";
import type {
  AdminOverview,
  OverviewItem,
  QueueKey,
  ReviewReport,
} from "@/types/operations-analytics-types";

const ITEM_LIMIT = 6;
const FACE_MATCH_FLAG = 80;
const OVERVIEW_QUEUES: QueueKey[] = [
  "campaigns",
  "kyc",
  "receipts",
  "petitions",
  "reports",
];

type ItemRow = {
  id: string;
  queue: QueueKey;
  title: string;
  detail: string;
  waiting_hours: number;
  face_match: number | null;
  mismatch: boolean;
};

const oldestItems = () =>
  prisma.$queryRaw<ItemRow[]>`
    SELECT * FROM (
      (SELECT c.id::text, 'campaigns' AS queue, c.title,
        COALESCE(NULLIF(trim(p.full_name), ''), p.email, 'Unknown creator') || ' · ₦' || to_char(c.goal, 'FM999,999,999') || ' goal' AS detail,
        EXTRACT(EPOCH FROM now() - c.created_at) / 3600 AS waiting_hours,
        NULL::int AS face_match, false AS mismatch
      FROM causes c JOIN profiles p ON p.id = c.user_id
      WHERE c.status = 'pending' ORDER BY c.created_at LIMIT ${ITEM_LIMIT})
      UNION ALL
      (SELECT k.id::text, 'kyc', COALESCE(NULLIF(trim(k.full_name), ''), 'Identity check'),
        'ID · ' || COALESCE(k.id_type, k.document_type),
        EXTRACT(EPOCH FROM now() - k.created_at) / 3600, k.face_match_score, false
      FROM kyc_verifications k
      WHERE k.status IN ('pending', 'in_progress', 'under_review') ORDER BY k.created_at LIMIT ${ITEM_LIMIT})
      UNION ALL
      (SELECT r.id::text, 'receipts', 'Receipt RC-' || r.receipt_no,
        c.title || COALESCE(' · ₦' || to_char(r.amount, 'FM999,999,999'), ''),
        EXTRACT(EPOCH FROM now() - r.created_at) / 3600, NULL,
        r.read_amount IS NOT NULL AND r.read_amount <> r.amount
      FROM campaign_proof_updates r JOIN causes c ON c.id = r.cause_id
      WHERE r.status = 'pending' ORDER BY r.created_at LIMIT ${ITEM_LIMIT})
      UNION ALL
      (SELECT pt.id::text, 'petitions', pt.title, 'Petition',
        EXTRACT(EPOCH FROM now() - pt.created_at) / 3600, NULL, false
      FROM petitions pt WHERE pt.status = 'pending' ORDER BY pt.created_at LIMIT ${ITEM_LIMIT})
      UNION ALL
      (SELECT rp.id::text, 'reports', a.title, 'Report · ' || rp.reason,
        EXTRACT(EPOCH FROM now() - rp.created_at) / 3600, NULL, false
      FROM api_campaign_reports rp JOIN api_campaigns a ON a.id = rp.api_campaign_id
      WHERE rp.status = 'pending' ORDER BY rp.created_at LIMIT ${ITEM_LIMIT})
    ) items
    ORDER BY waiting_hours DESC LIMIT ${ITEM_LIMIT}`;

const statusFor = (row: ItemRow): OverviewItem["status"] => {
  if (
    row.queue === "kyc" &&
    row.face_match != null &&
    row.face_match < FACE_MATCH_FLAG
  ) {
    return "face-match";
  }
  if (row.mismatch) return "amount-mismatch";
  if (row.waiting_hours > SLA_HOURS) return "over-sla";
  return row.queue === "reports" ? "reported" : "in-review";
};

async function loadOverview(period: AnalyticsPeriod): Promise<AdminOverview> {
  const w = getReportingWindow(period);
  const queueWindow = reportingWindow(period);
  const [totals, series, queues, [campaigns], items] = await Promise.all([
    giftTotals(w),
    giftSeries(w),
    Promise.all(OVERVIEW_QUEUES.map((key) => queueStats(key, queueWindow))),
    prisma.$queryRaw<{ active: number; created: number }[]>`
      SELECT
        COUNT(*) FILTER (WHERE NOT paused AND NOT compliance_paused
          AND (end_date IS NULL OR end_date > now()))::int AS active,
        COUNT(*) FILTER (WHERE created_at >= ${w.from})::int AS created
      FROM causes WHERE status = 'approved'`,
    oldestItems(),
  ]);

  return {
    raised: totals.total,
    previousRaised: totals.prev_total,
    activeCampaigns: campaigns.active,
    newCampaigns: campaigns.created,
    donations: { values: series.values, labels: w.labels },
    queues: queues.map(({ key, backlog, overSla, oldestWaitingAt }) => ({
      key,
      backlog,
      overSla,
      oldestWaitingAt,
    })),
    items: items.map((row) => ({
      id: row.id,
      queue: row.queue,
      title: row.title,
      detail: row.detail,
      waitingHours: Number(row.waiting_hours),
      status: statusFor(row),
      faceMatch: row.face_match,
    })),
  };
}

const getAdminOverviewData = unstable_cache(loadOverview, ["admin-overview"], {
  revalidate: 120,
  tags: [CAMPAIGN_ANALYTICS_TAG],
});

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

const getReviewReportData = unstable_cache(
  loadReviewReport,
  ["operations-review-report"],
  { revalidate: 300, tags: [CAMPAIGN_ANALYTICS_TAG] },
);

async function runReport<T>(period: AnalyticsPeriod, load: () => Promise<T>) {
  if (!analyticsPeriodSchema.safeParse(period).success) {
    return { success: false, error: "Unknown period", data: null };
  }
  try {
    return { success: true, error: null, data: await load() };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      data: null,
    };
  }
}

export async function getReviewReport(
  queue: QueueKey,
  period: AnalyticsPeriod,
) {
  if (!queueKeySchema.safeParse(queue).success) {
    return { success: false, error: "Unknown report", data: null };
  }
  return runReport(period, () => getReviewReportData(queue, period));
}

export async function getAdminOverview(period: AnalyticsPeriod) {
  return runReport(period, () => getAdminOverviewData(period));
}
