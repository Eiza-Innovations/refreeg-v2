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
const STORY_WINDOW_DAYS = 365;

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

const normalizeStory = (text: string) =>
  text.toLowerCase().replace(/\s+/g, " ").slice(0, 300);

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
      description: true,
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
  const images = [
    ...new Set(
      causes.map((c) => c.image).filter((v): v is string => Boolean(v)),
    ),
  ];
  const monthStart = reportingWindow("month").from;
  const storyLookback = new Date(now - STORY_WINDOW_DAYS * DAY_MS);

  const [
    imageMatches,
    recentDescriptions,
    donations,
    approvedKyc,
    rejectedReceipts,
    pastRemovals,
    audits,
    takenDown,
  ] = await Promise.all([
    images.length > 0
      ? prisma.cause.findMany({
          where: { image: { in: images }, id: { notIn: ids } },
          select: { id: true, userId: true, image: true, title: true },
        })
      : [],
    prisma.cause.findMany({
      where: {
        createdAt: { gte: storyLookback },
        description: { not: null },
      },
      select: { id: true, userId: true, title: true, description: true },
    }),
    ids.length > 0
      ? prisma.donation.findMany({
          where: { causeId: { in: ids }, status: "completed" },
          select: { causeId: true, email: true, amount: true, createdAt: true },
        })
      : [],
    userIds.length > 0
      ? prisma.kyc_verifications.findMany({
          where: { user_id: { in: userIds }, status: "approved" },
          select: { user_id: true },
        })
      : [],
    ids.length > 0
      ? prisma.campaign_proof_updates.groupBy({
          by: ["cause_id"],
          where: { cause_id: { in: ids }, status: "rejected" },
          _count: { _all: true },
        })
      : [],
    userIds.length > 0
      ? prisma.cause.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, status: "removed" },
          _count: { _all: true },
        })
      : [],
    ids.length > 0
      ? prisma.admin_audit_entries.findMany({
          where: {
            kind: "cause",
            target_id: { in: ids },
            action: AUDIT_CLEARED,
            created_at: { gte: new Date(now - CLEARED_QUIET_DAYS * DAY_MS) },
          },
          select: { target_id: true },
        })
      : [],
    prisma.admin_audit_entries.count({
      where: { action: AUDIT_TAKEN_DOWN, created_at: { gte: monthStart } },
    }),
  ]);

  // Match reused images across different creators.
  const imageById = new Map<string, string>();
  const allWithImages = [
    ...causes
      .filter((c) => c.image)
      .map((c) => ({
        id: c.id,
        userId: c.userId,
        image: c.image!,
        title: c.title,
      })),
    ...imageMatches
      .filter((c) => c.image)
      .map((c) => ({
        id: c.id,
        userId: c.userId,
        image: c.image!,
        title: c.title,
      })),
  ];
  for (const cause of causes) {
    if (!cause.image) continue;
    const twin = allWithImages.find(
      (other) =>
        other.image === cause.image &&
        other.id !== cause.id &&
        other.userId !== cause.userId,
    );
    if (twin) imageById.set(cause.id, twin.title);
  }

  // Match duplicate story prefixes across different creators.
  const storyById = new Map<string, string>();
  const storyEntries = recentDescriptions
    .filter((c) => (c.description?.length ?? 0) >= STORY_MIN_LENGTH)
    .map((c) => ({
      id: c.id,
      userId: c.userId,
      title: c.title,
      prefix: normalizeStory(c.description!),
    }));
  const byPrefix = new Map<string, typeof storyEntries>();
  for (const entry of storyEntries) {
    const list = byPrefix.get(entry.prefix) ?? [];
    list.push(entry);
    byPrefix.set(entry.prefix, list);
  }
  for (const cause of causes) {
    if ((cause.description?.length ?? 0) < STORY_MIN_LENGTH) continue;
    const prefix = normalizeStory(cause.description!);
    const twin = (byPrefix.get(prefix) ?? []).find(
      (other) => other.id !== cause.id && other.userId !== cause.userId,
    );
    if (twin) storyById.set(cause.id, twin.title);
  }

  // Aggregate per-cause donor stats in memory from completed donations.
  const causeById = new Map(causes.map((c) => [c.id, c]));
  const donationsByCause = new Map<string, typeof donations>();
  for (const d of donations) {
    const list = donationsByCause.get(d.causeId) ?? [];
    list.push(d);
    donationsByCause.set(d.causeId, list);
  }

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
    const launched = (
      cause.start_date ??
      cause.createdAt ??
      new Date()
    ).getTime();
    const twoDaysAfterLaunch = launched + 2 * DAY_MS;
    const creatorEmail = cause.user.email?.toLowerCase();

    const perDonor = new Map<string, number>();
    let total = 0;
    let creatorTotal = 0;
    let firstTwoDays = 0;
    for (const d of donationsByCause.get(cause.id) ?? []) {
      const amount = Number(d.amount);
      const email = d.email.toLowerCase();
      total += amount;
      perDonor.set(email, (perDonor.get(email) ?? 0) + amount);
      if (creatorEmail && email === creatorEmail) creatorTotal += amount;
      if (d.createdAt && d.createdAt.getTime() < twoDaysAfterLaunch) {
        firstTwoDays += amount;
      }
    }
    const donorCount = perDonor.size;
    const topAmount = Math.max(0, ...perDonor.values());
    const topShare = total > 0 ? topAmount / total : 0;

    const accountAgeDays = Math.floor(
      (launched - cause.user.createdAt.getTime()) / DAY_MS,
    );
    const fullName = ownerName(cause.user);
    const accountTokens = nameTokens(cause.user.accountName);
    const nameShared = [...nameTokens(fullName)].some((token) =>
      accountTokens.has(token),
    );
    const causeMeta = causeById.get(cause.id);

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
      donorCount >= 3 &&
        topShare >= 0.5 && {
          key: "donor_concentration",
          label: "One donor dominates",
          weight: 20,
          detail: `${Math.round(topShare * 100)}% of the money came from one email`,
        },
      creatorTotal > 0 && {
        key: "self_donation",
        label: "Creator donated",
        weight: 18,
        detail: `${formatNairaShort(creatorTotal)} came from the creator's own email`,
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
        firstTwoDays >= goal * 0.8 && {
          key: "fast_raise",
          label: "Raised very fast",
          weight: 14,
          detail: `${Math.round((firstTwoDays / goal) * 100)}% of the goal in the first 2 days`,
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
      signals.reduce((totalScore, signal) => totalScore + signal.weight, 0),
    );
    if (score < RISK_MEDIUM || !causeMeta) return [];

    return [
      {
        id: cause.id,
        title: cause.title,
        owner: fullName,
        score,
        suggestion: suggestionFor(score),
        signals,
        raised: Number(cause.raised ?? 0),
        donors: donorCount,
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
