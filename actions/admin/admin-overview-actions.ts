"use server";

import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/lib/auth/admin-auth";
import { prisma } from "@/lib/prisma";
import { reviewQueueWhere as where } from "@/lib/admin/review-queues";
import { getReportingWindow } from "@/lib/admin-analytics/period";
import {
  campaignStatus,
  giftSeries,
  giftTotals,
} from "@/lib/admin-analytics/workspace-data";
import type {
  AdminOverviewData,
  QueueStat,
  WaitingRow,
} from "@/types/admin-overview-types";

const WAITING_LIMIT = 6;

type RawWaitingItem = Omit<WaitingRow, "owner"> & { ownerId: string | null };

async function waitingItems(): Promise<WaitingRow[]> {
  try {
    const [causes, kycs, receipts, petitions, reports] = await Promise.all([
      prisma.cause?.findMany
        ? prisma.cause.findMany({
            where: where.campaigns,
            orderBy: { createdAt: "asc" },
            take: WAITING_LIMIT,
            select: {
              id: true,
              title: true,
              userId: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      (prisma as any).kyc_verifications?.findMany
        ? (prisma as any).kyc_verifications.findMany({
            where: where.kyc,
            orderBy: { created_at: "asc" },
            take: WAITING_LIMIT,
            select: {
              user_id: true,
              full_name: true,
              document_type: true,
              created_at: true,
            },
          })
        : Promise.resolve([]),
      (prisma as any).campaign_proof_updates?.findMany
        ? (prisma as any).campaign_proof_updates.findMany({
            where: where.receipts,
            orderBy: { created_at: "asc" },
            take: WAITING_LIMIT,
            select: {
              id: true,
              receipt_title: true,
              user_id: true,
              created_at: true,
              cause: { select: { title: true } },
            },
          })
        : Promise.resolve([]),
      (prisma as any).petitions?.findMany
        ? (prisma as any).petitions.findMany({
            where: where.petitions,
            orderBy: { created_at: "asc" },
            take: WAITING_LIMIT,
            select: {
              id: true,
              title: true,
              user_id: true,
              created_at: true,
            },
          })
        : Promise.resolve([]),
      (prisma as any).content_reports?.findMany
        ? (prisma as any).content_reports.findMany({
            where: where.reports,
            orderBy: { created_at: "asc" },
            take: WAITING_LIMIT,
            select: {
              id: true,
              reason: true,
              target_type: true,
              reporter_id: true,
              created_at: true,
              due_at: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const combined: RawWaitingItem[] = [
      ...causes.flatMap((c: any) =>
        c.createdAt
          ? [
              {
                type: "Campaign" as const,
                ref: c.id,
                title: c.title,
                detail: null,
                ownerId: c.userId,
                created_at: c.createdAt,
                due_at: null,
              },
            ]
          : [],
      ),
      ...kycs.flatMap((k: any) =>
        k.created_at
          ? [
              {
                type: "KYC" as const,
                ref: k.user_id,
                title: k.full_name?.trim() || "KYC review",
                detail: k.document_type ?? null,
                ownerId: k.user_id,
                created_at: k.created_at,
                due_at: null,
              },
            ]
          : [],
      ),
      ...receipts.flatMap((r: any) =>
        r.created_at
          ? [
              {
                type: "Receipt" as const,
                ref: r.id,
                title: r.receipt_title?.trim() || "Fund-use proof",
                detail: r.cause?.title ?? null,
                ownerId: r.user_id,
                created_at: r.created_at,
                due_at: null,
              },
            ]
          : [],
      ),
      ...petitions.flatMap((p: any) =>
        p.created_at
          ? [
              {
                type: "Petition" as const,
                ref: p.id,
                title: p.title,
                detail: null,
                ownerId: p.user_id,
                created_at: p.created_at,
                due_at: null,
              },
            ]
          : [],
      ),
      ...reports.flatMap((rep: any) =>
        rep.created_at
          ? [
              {
                type: "Report" as const,
                ref: rep.id,
                title: rep.reason,
                detail: rep.target_type ?? null,
                ownerId: rep.reporter_id ?? null,
                created_at: rep.created_at,
                due_at: rep.due_at ?? null,
              },
            ]
          : [],
      ),
    ]
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
      .slice(0, WAITING_LIMIT);

    const ownerIds = Array.from(
      new Set(combined.flatMap((item) => (item.ownerId ? [item.ownerId] : []))),
    );
    const owners =
      ownerIds.length > 0 && prisma.user?.findMany
        ? await prisma.user.findMany({
            where: { id: { in: ownerIds } },
            select: { id: true, fullName: true, username: true, email: true },
          })
        : [];
    const ownerMap = new Map(
      owners.map((u) => [
        u.id,
        u.fullName?.trim() || u.username?.trim() || u.email || null,
      ]),
    );

    return combined.map(({ ownerId, ...row }) => ({
      ...row,
      owner: ownerId ? (ownerMap.get(ownerId) ?? null) : null,
    }));
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
