"use server";

import { unstable_cache } from "next/cache";
import { requireAdminOrManager } from "@/lib/auth/admin-auth";
import { prisma } from "@/lib/prisma";
import { DAY_MS, reportingWindow } from "@/lib/campaign-analytics/period";
import {
  CAMPAIGN_ANALYTICS_TAG,
  ownerName,
  ownerSelect,
} from "@/lib/campaign-analytics/shared";
import { formatNairaShort } from "@/lib/causes/discover-summary";
import {
  AUDIT_CLEARED,
  AUDIT_TAKEN_DOWN,
  RISK_HIGH,
  RISK_MEDIUM,
} from "@/lib/campaign-analytics/risk-levels";
import type {
  FraudRiskReport,
  RiskRow,
  RiskSignal,
  RiskSuggestion,
} from "@/types/campaign-analytics-types";

const CLEARED_QUIET_DAYS = 30;
const LOOKBACK_DAYS = 90;
const NEW_ACCOUNT_DAYS = 14;
const STORY_MIN_LENGTH = 120;

const suggestionFor = (score: number): RiskSuggestion =>
  score >= 80
    ? "take-down"
    : score >= RISK_HIGH
      ? "freeze"
      : score >= 50
        ? "review"
        : "watch";

const nameTokens = (value: string | null | undefined) =>
  new Set(
    (value ?? "")
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((token) => token.length > 2),
  );

type DonorStats = {
  cause_id: string;
  donors: number;
  total: number;
  top_share: number | null;
  creator_total: number;
  first_two_days: number;
};

async function loadFraudRisk(): Promise<FraudRiskReport> {
  const now = Date.now();
  const causes = await prisma.cause.findMany({
    where: {
      status: "approved",
      OR: [
        { end_date: null },
        { end_date: { gte: new Date(now - LOOKBACK_DAYS * DAY_MS) } },
      ],
    },
    select: {
      id: true,
      title: true,
      goal: true,
      raised: true,
      image: true,
      createdAt: true,
      start_date: true,
      compliance_paused: true,
      compliance_paused_at: true,
      userId: true,
      user: {
        select: {
          ...ownerSelect,
          createdAt: true,
          isBlocked: true,
          accountName: true,
        },
      },
    },
  });
  const ids = causes.map((cause) => cause.id);
  const userIds = [...new Set(causes.map((cause) => cause.userId))];
  const monthStart = reportingWindow("month").from;

  const [
    imageTwins,
    storyTwins,
    donorStats,
    approvedKyc,
    rejectedReceipts,
    pastRemovals,
    audits,
    takenDown,
  ] = await Promise.all([
    prisma.$queryRaw<{ id: string; other: string }[]>`
      SELECT DISTINCT ON (a.id) a.id, b.title AS other
      FROM causes a JOIN causes b
        ON b.image = a.image AND b.id <> a.id AND b.user_id <> a.user_id
      WHERE a.id = ANY(${ids}::uuid[]) AND COALESCE(a.image, '') <> ''`,
    prisma.$queryRaw<{ id: string; other: string }[]>`
      WITH norm AS (
        SELECT id, user_id, title,
          LEFT(regexp_replace(lower(description), '\\s+', ' ', 'g'), 300) AS story
        FROM causes WHERE length(COALESCE(description, '')) >= ${STORY_MIN_LENGTH}
      )
      SELECT DISTINCT ON (a.id) a.id, b.title AS other
      FROM norm a JOIN norm b
        ON b.story = a.story AND b.id <> a.id AND b.user_id <> a.user_id
      WHERE a.id = ANY(${ids}::uuid[])`,
    prisma.$queryRaw<DonorStats[]>`
      WITH per_donor AS (
        SELECT d.cause_id, lower(d.email) AS email, SUM(d.amount)::float8 AS amount,
          MIN(d.created_at) AS first_at
        FROM donations d
        WHERE d.status = 'completed' AND d.cause_id = ANY(${ids}::uuid[])
        GROUP BY 1, 2
      )
      SELECT p.cause_id,
        COUNT(*)::int AS donors,
        SUM(p.amount) AS total,
        MAX(p.amount) / NULLIF(SUM(p.amount), 0) AS top_share,
        COALESCE(SUM(p.amount) FILTER (WHERE p.email = lower(u.email)), 0) AS creator_total,
        COALESCE((
          SELECT SUM(d.amount)::float8 FROM donations d
          WHERE d.cause_id = p.cause_id AND d.status = 'completed'
            AND d.created_at < COALESCE(c.start_date, c.created_at) + interval '2 days'
        ), 0) AS first_two_days
      FROM per_donor p
      JOIN causes c ON c.id = p.cause_id
      JOIN profiles u ON u.id = c.user_id
      GROUP BY p.cause_id, c.start_date, c.created_at`,
    prisma.kyc_verifications.findMany({
      where: { user_id: { in: userIds }, status: "approved" },
      select: { user_id: true },
    }),
    prisma.campaign_proof_updates.groupBy({
      by: ["cause_id"],
      where: { cause_id: { in: ids }, status: "rejected" },
      _count: { _all: true },
    }),
    prisma.cause.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, status: "removed" },
      _count: { _all: true },
    }),
    prisma.admin_audit_entries.findMany({
      where: {
        kind: "cause",
        target_id: { in: ids },
        action: AUDIT_CLEARED,
        created_at: { gte: new Date(now - CLEARED_QUIET_DAYS * DAY_MS) },
      },
      select: { target_id: true },
    }),
    prisma.admin_audit_entries.count({
      where: { action: AUDIT_TAKEN_DOWN, created_at: { gte: monthStart } },
    }),
  ]);

  const imageById = new Map(imageTwins.map((row) => [row.id, row.other]));
  const storyById = new Map(storyTwins.map((row) => [row.id, row.other]));
  const statsById = new Map(donorStats.map((row) => [row.cause_id, row]));
  const kycUsers = new Set(approvedKyc.map((row) => row.user_id));
  const receiptsById = new Map(
    rejectedReceipts.map((row) => [row.cause_id, row._count._all]),
  );
  const removalsByUser = new Map(
    pastRemovals.map((row) => [row.userId, row._count._all]),
  );
  const cleared = new Set(audits.map((row) => row.target_id));

  const rows = causes.flatMap((cause): RiskRow[] => {
    if (cleared.has(cause.id)) return [];
    const goal = Number(cause.goal);
    const stats = statsById.get(cause.id);
    const launched = (
      cause.start_date ??
      cause.createdAt ??
      new Date()
    ).getTime();
    const accountAgeDays = Math.floor(
      (launched - cause.user.createdAt.getTime()) / DAY_MS,
    );
    const fullName = ownerName(cause.user);
    const accountTokens = nameTokens(cause.user.accountName);
    const nameShared = [...nameTokens(fullName)].some((token) =>
      accountTokens.has(token),
    );

    const candidates: (RiskSignal | false)[] = [
      imageById.has(cause.id) && {
        key: "reused_image",
        label: "Image reused",
        weight: 34,
        detail: `Same image as “${imageById.get(cause.id)}”`,
      },
      storyById.has(cause.id) && {
        key: "duplicate_story",
        label: "Duplicate story",
        weight: 26,
        detail: `Story matches “${storyById.get(cause.id)}”`,
      },
      (removalsByUser.get(cause.userId) ?? 0) > 0 && {
        key: "prior_removal",
        label: "Earlier campaign removed",
        weight: 24,
        detail: `${removalsByUser.get(cause.userId)} of this creator's campaigns were taken down`,
      },
      Boolean(cause.user.isBlocked) && {
        key: "blocked_creator",
        label: "Creator blocked",
        weight: 22,
        detail: "The creator's account is blocked",
      },
      stats != null &&
        stats.donors >= 3 &&
        (stats.top_share ?? 0) >= 0.5 && {
          key: "donor_concentration",
          label: "One donor dominates",
          weight: 20,
          detail: `${Math.round((stats.top_share ?? 0) * 100)}% of the money came from one email`,
        },
      stats != null &&
        stats.creator_total > 0 && {
          key: "self_donation",
          label: "Creator donated",
          weight: 18,
          detail: `${formatNairaShort(stats.creator_total)} came from the creator's own email`,
        },
      Boolean(cause.user.accountName) &&
        !nameShared && {
          key: "bank_name_mismatch",
          label: "Bank name differs",
          weight: 18,
          detail: `Payout account “${cause.user.accountName}” doesn't match ${fullName}`,
        },
      (receiptsById.get(cause.id) ?? 0) > 0 && {
        key: "rejected_receipt",
        label: "Receipt rejected",
        weight: 16,
        detail: `${receiptsById.get(cause.id)} receipt(s) rejected in review`,
      },
      !kycUsers.has(cause.userId) && {
        key: "no_kyc",
        label: "No approved ID",
        weight: 14,
        detail: "The creator hasn't passed identity checks",
      },
      goal > 0 &&
        stats != null &&
        stats.first_two_days >= goal * 0.8 && {
          key: "fast_raise",
          label: "Raised very fast",
          weight: 14,
          detail: `${Math.round((stats.first_two_days / goal) * 100)}% of the goal in the first 2 days`,
        },
      accountAgeDays < NEW_ACCOUNT_DAYS && {
        key: "new_account",
        label: "New account",
        weight: 12,
        detail: `Account opened ${Math.max(0, accountAgeDays)} day(s) before launch`,
      },
    ];
    const signals = candidates
      .filter((signal): signal is RiskSignal => Boolean(signal))
      .sort((a, b) => b.weight - a.weight);
    const score = Math.min(
      100,
      signals.reduce((total, signal) => total + signal.weight, 0),
    );
    if (score < RISK_MEDIUM) return [];

    return [
      {
        id: cause.id,
        title: cause.title,
        owner: fullName,
        score,
        suggestion: suggestionFor(score),
        signals,
        raised: Number(cause.raised ?? 0),
        donors: stats?.donors ?? 0,
        frozen: cause.compliance_paused,
        frozenAt: cause.compliance_paused_at?.toISOString() ?? null,
      },
    ];
  });

  return {
    rows: rows.sort((a, b) => b.score - a.score),
    scored: causes.length,
    confirmedThisMonth: takenDown,
  };
}

const cachedFraudRisk = unstable_cache(
  loadFraudRisk,
  ["campaign-analytics-fraud-risk"],
  { revalidate: 3600, tags: [CAMPAIGN_ANALYTICS_TAG] },
);

export async function getFraudRiskData(): Promise<FraudRiskReport> {
  await requireAdminOrManager();
  return cachedFraudRisk();
}
