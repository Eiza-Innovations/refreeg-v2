"use server";

import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/lib/auth/admin-auth";
import { prisma } from "@/lib/prisma";
import { reviewQueueWhere as where } from "@/lib/admin/review-queues";
import { getReportingWindow } from "@/lib/admin-analytics/period";
import {
  campaignStatus,
  displayName,
  giftSeries,
  giftTotals,
} from "@/lib/admin-analytics/workspace-data";

const WAITING_LIMIT = 6;

type QueueStat = { count: number; oldest: Date | null };

export type WaitingRow = {
  type: "Campaign" | "KYC" | "Receipt" | "Petition" | "Report";
  /** Route param for the item's review page (user id for KYC, else the item id). */
  ref: string;
  title: string;
  detail: string | null;
  owner: string | null;
  created_at: Date;
  due_at: Date | null;
};

export type AdminOverviewData = {
  role: "admin" | "manager";
  generatedAt: Date;
  label: string;
  queues: {
    campaigns: QueueStat;
    kyc: QueueStat;
    receipts: QueueStat;
    petitions: QueueStat;
    reports: QueueStat;
  };
  reportsOverdue: number;
  waiting: WaitingRow[];
  campaigns: { active: number; inactive: number; paused: number };
  /** Admins only: managers never receive money figures. */
  money: {
    totals: Awaited<ReturnType<typeof giftTotals>>;
    series: Awaited<ReturnType<typeof giftSeries>>;
    labels: string[];
  } | null;
};

async function waitingItems() {
  return prisma.$queryRaw<WaitingRow[]>`
    SELECT w.type, w.ref, w.title, w.detail, ${displayName} AS owner,
      w.created_at, w.due_at
    FROM (
      SELECT 'Campaign' AS type, id::text AS ref, title::text AS title,
        NULL::text AS detail, user_id AS owner_id, created_at,
        NULL::timestamptz AS due_at
      FROM causes WHERE status = 'pending'
      UNION ALL
      SELECT 'KYC', user_id::text, COALESCE(NULLIF(trim(full_name), ''), 'KYC review'),
        document_type::text, user_id, created_at, NULL
      FROM kyc_verifications WHERE status IN ('pending', 'in_progress')
      UNION ALL
      SELECT 'Receipt', u.id::text, COALESCE(NULLIF(u.receipt_title, ''), 'Fund-use proof'),
        c.title::text, u.user_id, u.created_at, NULL
      FROM campaign_proof_updates u JOIN causes c ON c.id = u.cause_id
      WHERE u.status = 'pending'
      UNION ALL
      SELECT 'Petition', id::text, title::text, NULL, user_id, created_at, NULL
      FROM petitions WHERE status = 'pending'
      UNION ALL
      SELECT 'Report', id::text, reason::text, target_type::text, reporter_id,
        created_at, due_at
      FROM content_reports WHERE status = 'pending'
    ) w
    LEFT JOIN profiles p ON p.id = w.owner_id
    ORDER BY w.created_at ASC
    LIMIT ${WAITING_LIMIT}`;
}

/** Review queues, oldest waiting items and (for admins) this month's giving. */
export async function getAdminOverview() {
  const session = await auth();
  const userId = session?.user?.id;
  const role = userId ? await getUserRole(userId) : "user";
  if (role !== "admin" && role !== "manager") {
    return { success: false as const, error: "Unauthorized", data: null };
  }

  const now = new Date();
  const window = getReportingWindow("month", now);
  const isAdmin = role === "admin";

  const [
    campaigns,
    kyc,
    receipts,
    petitions,
    reports,
    overdue,
    waiting,
    status,
  ] = await Promise.all([
    prisma.cause.aggregate({
      where: where.campaigns,
      _count: true,
      _min: { createdAt: true },
    }),
    prisma.kyc_verifications.aggregate({
      where: where.kyc,
      _count: true,
      _min: { created_at: true },
    }),
    prisma.campaign_proof_updates.aggregate({
      where: where.receipts,
      _count: true,
      _min: { created_at: true },
    }),
    prisma.petitions.aggregate({
      where: where.petitions,
      _count: true,
      _min: { created_at: true },
    }),
    prisma.content_reports.aggregate({
      where: where.reports,
      _count: true,
      _min: { created_at: true },
    }),
    // The report's own due_at is the only SLA in the schema.
    prisma.content_reports.count({
      where: { ...where.reports, due_at: { lt: now } },
    }),
    waitingItems(),
    campaignStatus(),
  ]);
  const [totals, series] = isAdmin
    ? await Promise.all([giftTotals(window), giftSeries(window)])
    : [null, null];

  const stat = (count: number, oldest: Date | null): QueueStat => ({
    count,
    oldest,
  });

  const data: AdminOverviewData = {
    role,
    generatedAt: now,
    label: window.label,
    queues: {
      campaigns: stat(campaigns._count, campaigns._min.createdAt),
      kyc: stat(kyc._count, kyc._min.created_at),
      receipts: stat(receipts._count, receipts._min.created_at),
      petitions: stat(petitions._count, petitions._min.created_at),
      reports: stat(reports._count, reports._min.created_at),
    },
    reportsOverdue: overdue,
    waiting,
    campaigns: status,
    money: totals && series ? { totals, series, labels: window.labels } : null,
  };
  return { success: true as const, error: null, data };
}
