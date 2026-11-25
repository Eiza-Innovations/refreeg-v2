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
import type {
  AdminOverviewData,
  QueueStat,
  WaitingRow,
} from "@/types/admin-overview-types";

const WAITING_LIMIT = 6;

async function waitingItems() {
  try {
    return await prisma.$queryRaw<WaitingRow[]>`
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
  } catch (err) {
    console.error("waitingItems query error:", err);
    return [];
  }
}

/** Review queues, oldest waiting items and (for admins) this month's giving. */
export async function getAdminOverview() {
  const session = await auth();
  const userId = session?.user?.id;
  const role = userId ? await getUserRole(userId) : "user";
  if (role !== "admin" && role !== "manager") {
    return { success: false as const, error: "Unauthorized", data: null };
  }

  try {
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
      prisma.cause?.aggregate
        ? prisma.cause.aggregate({
            where: where.campaigns,
            _count: true,
            _min: { createdAt: true },
          })
        : Promise.resolve({ _count: 0, _min: { createdAt: null } }),
      (prisma as any).kyc_verifications?.aggregate
        ? (prisma as any).kyc_verifications.aggregate({
            where: where.kyc,
            _count: true,
            _min: { created_at: true },
          })
        : Promise.resolve({ _count: 0, _min: { created_at: null } }),
      (prisma as any).campaign_proof_updates?.aggregate
        ? (prisma as any).campaign_proof_updates.aggregate({
            where: where.receipts,
            _count: true,
            _min: { created_at: true },
          })
        : Promise.resolve({ _count: 0, _min: { created_at: null } }),
      (prisma as any).petitions?.aggregate
        ? (prisma as any).petitions.aggregate({
            where: where.petitions,
            _count: true,
            _min: { created_at: true },
          })
        : Promise.resolve({ _count: 0, _min: { created_at: null } }),
      (prisma as any).content_reports?.aggregate
        ? (prisma as any).content_reports.aggregate({
            where: where.reports,
            _count: true,
            _min: { created_at: true },
          })
        : Promise.resolve({ _count: 0, _min: { created_at: null } }),
      (prisma as any).content_reports?.count
        ? (prisma as any).content_reports.count({
            where: { ...where.reports, due_at: { lt: now } },
          })
        : Promise.resolve(0),
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
      money:
        totals && series ? { totals, series, labels: window.labels } : null,
    };
    return { success: true as const, error: null, data };
  } catch (err) {
    console.error("getAdminOverview error:", err);
    return {
      success: false as const,
      error: (err as Error).message || "Failed to load overview data",
      data: null,
    };
  }
}
