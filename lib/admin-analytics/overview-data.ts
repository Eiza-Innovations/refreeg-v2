import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getReportingWindow } from "@/lib/admin-analytics/period";
import { giftSeries, giftTotals } from "@/lib/admin-analytics/workspace-data";
import { reportingWindow } from "@/lib/campaign-analytics/period";
import { CAMPAIGN_ANALYTICS_TAG } from "@/lib/campaign-analytics/shared";
import { queueStats, SLA_HOURS } from "@/lib/operations-analytics/queues";
import type { AnalyticsPeriod } from "@/types/campaign-analytics-types";
import type {
  AdminOverview,
  OverviewItem,
  QueueKey,
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

/** Oldest waiting work across every review queue. */
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

export const getAdminOverviewData = unstable_cache(
  loadOverview,
  ["admin-overview"],
  { revalidate: 120, tags: [CAMPAIGN_ANALYTICS_TAG] },
);
