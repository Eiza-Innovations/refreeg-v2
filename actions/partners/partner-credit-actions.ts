"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/lib/auth/admin-auth";
import { prisma } from "@/lib/prisma";
import { partnerCategoryOptions } from "@/lib/options/partner-credits.options";
import {
  allocateCreditsSchema,
  managePartnerSchema,
  onboardPartnerSchema,
  rejectPartnerRequestSchema,
  requestTopUpSchema,
} from "@/lib/schemas/partner-credits.schema";
import { sendPartnerCreditsIssuedEmail } from "@/services/mail";
import type {
  AdminPartnerCreditsDashboardData,
  PartnerAccountSummary,
  PartnerActionResult,
  PartnerCreditRequestItem,
  PartnerCreditRequestKind,
  PartnerCreditRequestStatus,
  PartnerCreditTransactionItem,
  PartnerCreditTransactionType,
  PartnerCreditsDashboardData,
  PartnerStatus,
} from "@/types/partner-credit-types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const uuidSchema = z.string().trim().uuid();

class PartnerDomainError extends Error {}

function parseCurrencyInput(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim();
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
}

function toNum(value: unknown): number {
  if (value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function revalidatePartnerViews(causeId?: string) {
  revalidatePath("/dashboard/admin/partners");
  revalidatePath("/dashboard/partner-credits");
  if (causeId) {
    revalidatePath(`/causes/${causeId}`);
  }
}

function categoryTokensFor(categories: readonly string[]): Set<string> {
  const tokens = new Set<string>();
  for (const raw of categories) {
    const lower = raw.trim().toLowerCase();
    if (!lower) continue;
    tokens.add(lower);
    const matched = partnerCategoryOptions.find(
      (opt) => opt.value === lower || opt.label.toLowerCase() === lower,
    );
    if (matched) {
      tokens.add(matched.value);
      tokens.add(matched.label.toLowerCase());
    }
  }
  return tokens;
}

function toPartnerSummary(row: {
  id: string;
  name: string;
  contactEmail: string;
  status: string;
  creditsIssued: unknown;
  creditsUsed: unknown;
  expiresAt: Date;
  eligibleCategories: string[];
  rulesNote: string | null;
  maxPerCampaign: unknown;
  employeeMatchingEnabled: boolean;
  matchingRatio: string | null;
  reconciliationRef: string | null;
  partnerSince: Date | null;
  createdAt: Date;
}): PartnerAccountSummary {
  const issued = toNum(row.creditsIssued);
  const used = toNum(row.creditsUsed);
  const available = Math.max(0, Math.round((issued - used) * 100) / 100);
  const utilizationPct =
    issued > 0 ? Math.min(100, Math.round((used / issued) * 100)) : 0;

  return {
    id: row.id,
    name: row.name,
    contactEmail: row.contactEmail,
    status: row.status as PartnerStatus,
    creditsIssued: issued,
    creditsUsed: used,
    creditsAvailable: available,
    utilizationPct,
    expiresAt: row.expiresAt.toISOString(),
    isExpired: row.expiresAt.getTime() < Date.now(),
    eligibleCategories: row.eligibleCategories,
    rulesNote: row.rulesNote,
    maxPerCampaign:
      row.maxPerCampaign != null ? toNum(row.maxPerCampaign) : null,
    employeeMatchingEnabled: row.employeeMatchingEnabled,
    matchingRatio: row.matchingRatio || "1:1",
    reconciliationRef: row.reconciliationRef,
    partnerSince: row.partnerSince ? row.partnerSince.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function getAuthenticatedUser(): Promise<
  | { ok: true; userId: string; email?: string | null }
  | { ok: false; error: string }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Sign in to continue." };
  }
  return { ok: true, userId, email: session.user.email };
}

async function getAdminActor(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const actor = await getAuthenticatedUser();
  if (!actor.ok) return actor;
  const role = await getUserRole(actor.userId);
  if (role !== "admin" && role !== "manager") {
    return { ok: false, error: "Admin access is required." };
  }
  return { ok: true, userId: actor.userId };
}

export async function getAdminPartnerCreditsDashboard(): Promise<
  PartnerActionResult<AdminPartnerCreditsDashboardData>
> {
  const actor = await getAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const [partnerRows, requestRows] = await Promise.all([
    prisma.partnerAccount.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.partnerCreditRequest.findMany({
      where: { status: "pending_approval" },
      include: {
        partner: { select: { name: true, contactEmail: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const requesterIds = Array.from(
    new Set(requestRows.map((row) => row.requestedById)),
  );
  const requesters =
    requesterIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: requesterIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
  const requesterMap = new Map(
    requesters.map((u) => [u.id, u.fullName || u.email || "Admin"]),
  );

  const now = Date.now();
  const cutoff = now + THIRTY_DAYS_MS;

  const partners = partnerRows.map(toPartnerSummary);
  const activePartners = partners.filter(
    (p) => p.status !== "pending_approval" && p.status !== "rejected",
  );
  const creditsIssued = activePartners.reduce(
    (sum, p) => sum + p.creditsIssued,
    0,
  );
  const creditsUsed = activePartners.reduce((sum, p) => sum + p.creditsUsed, 0);
  const expiringIn30Days = activePartners.reduce((sum, p) => {
    const expMs = Date.parse(p.expiresAt);
    if (expMs > now && expMs <= cutoff) {
      return sum + p.creditsAvailable;
    }
    return sum;
  }, 0);

  const pendingRequests: PartnerCreditRequestItem[] = requestRows.map((r) => ({
    id: r.id,
    partnerId: r.partnerId,
    partnerName: r.partner.name,
    partnerEmail: r.partner.contactEmail,
    kind: r.kind as PartnerCreditRequestKind,
    amount: toNum(r.amount),
    reconciliationRef: r.reconciliationRef,
    note: r.note,
    status: r.status as PartnerCreditRequestStatus,
    requestedById: r.requestedById,
    requesterName: requesterMap.get(r.requestedById) || "Admin",
    createdAt: r.createdAt.toISOString(),
  }));

  return {
    success: true,
    data: {
      kpis: {
        partnerCount: activePartners.length,
        creditsIssued,
        creditsUsed,
        expiringIn30Days,
      },
      partners,
      pendingRequests,
      currentAdminId: actor.userId,
    },
  };
}

export async function onboardPartnerAction(
  input: unknown,
): Promise<PartnerActionResult<{ partnerId: string; requestId: string }>> {
  const actor = await getAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = onboardPartnerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid onboarding fields.",
    };
  }

  const data = parsed.data;
  const amount = parseCurrencyInput(data.creditsToIssue);
  if (amount <= 0) {
    return { success: false, error: "Enter a credit amount greater than ₦0." };
  }
  const maxPerCampaign = data.maxPerCampaign
    ? parseCurrencyInput(data.maxPerCampaign)
    : null;
  const expiresAt = new Date(data.expiresAt);

  const existing = await prisma.partnerAccount.findUnique({
    where: { contactEmail: data.contactEmail },
    select: { id: true },
  });
  if (existing) {
    return {
      success: false,
      error: "A partner with this contact email already exists.",
    };
  }

  const matchedUser = await prisma.user.findUnique({
    where: { email: data.contactEmail },
    select: { id: true, emailVerified: true },
  });
  const verifiedUserId = matchedUser?.emailVerified ? matchedUser.id : null;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const partner = await tx.partnerAccount.create({
        data: {
          name: data.name,
          contactEmail: data.contactEmail,
          userId: verifiedUserId,
          status: "pending_approval",
          creditsIssued: 0,
          creditsUsed: 0,
          expiresAt,
          eligibleCategories: data.eligibleCategories,
          rulesNote: data.rulesNote || null,
          maxPerCampaign,
          employeeMatchingEnabled: data.employeeMatchingEnabled,
          matchingRatio: "1:1",
          reconciliationRef: data.reconciliationRef,
          paymentReconciled: data.paymentReconciled,
          createdById: actor.userId,
        },
        select: { id: true },
      });

      const request = await tx.partnerCreditRequest.create({
        data: {
          partnerId: partner.id,
          kind: "initial_grant",
          amount,
          reconciliationRef: data.reconciliationRef,
          note: data.rulesNote || null,
          status: "pending_approval",
          requestedById: actor.userId,
        },
        select: { id: true },
      });

      await tx.logs.create({
        data: {
          action: `partner-onboard-requested:${partner.id}:${amount}`,
          admin_id: actor.userId,
          created_at: new Date(),
        },
      });

      return { partnerId: partner.id, requestId: request.id };
    });

    revalidatePartnerViews();
    return { success: true, data: created };
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === "P2002") {
      return {
        success: false,
        error: "A partner with this contact email already exists.",
      };
    }
    console.error("[PartnerCredits] Onboard error:", error);
    return { success: false, error: "Could not onboard partner." };
  }
}

export async function approvePartnerCreditRequestAction(
  requestId: string,
): Promise<PartnerActionResult> {
  const actor = await getAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };
  if (!uuidSchema.safeParse(requestId).success) {
    return { success: false, error: "Invalid credit request ID." };
  }

  const request = await prisma.partnerCreditRequest.findUnique({
    where: { id: requestId },
    include: { partner: true },
  });
  if (!request) {
    return { success: false, error: "Credit request not found." };
  }
  if (request.status !== "pending_approval") {
    return {
      success: false,
      error: "This credit request has already been reviewed.",
    };
  }
  if (request.requestedById === actor.userId) {
    return {
      success: false,
      error: "A second admin must approve this credit request.",
    };
  }

  const now = new Date();
  const amount = toNum(request.amount);
  let verifiedUserId = request.partner.userId;
  if (!verifiedUserId) {
    const existingUser = await prisma.user.findUnique({
      where: { email: request.partner.contactEmail },
      select: { id: true, emailVerified: true },
    });
    verifiedUserId = existingUser?.emailVerified ? existingUser.id : null;
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const claimed = await tx.partnerCreditRequest.updateMany({
        where: { id: requestId, status: "pending_approval" },
        data: {
          status: "approved",
          reviewedById: actor.userId,
          reviewedAt: now,
        },
      });
      if (claimed.count !== 1) {
        return { conflict: true as const };
      }

      const nextStatus =
        request.kind === "initial_grant"
          ? verifiedUserId
            ? "active"
            : "invited"
          : request.partner.status === "exhausted"
            ? "active"
            : request.partner.status;

      await tx.partnerAccount.update({
        where: { id: request.partnerId },
        data: {
          userId: verifiedUserId,
          creditsIssued: { increment: amount },
          status: nextStatus,
          ...(request.kind === "initial_grant"
            ? {
                approvedById: actor.userId,
                approvedAt: now,
                partnerSince: now,
              }
            : {}),
        },
      });

      await tx.partnerCreditTransaction.create({
        data: {
          partnerId: request.partnerId,
          type: request.kind,
          amount,
          note:
            request.kind === "initial_grant"
              ? `Initial grant approved (${request.reconciliationRef || "reconciled"})`
              : `Top up approved (${request.reconciliationRef || "manual"})`,
          createdById: actor.userId,
        },
      });

      await tx.logs.create({
        data: {
          action: `partner-credits-approved:${request.partnerId}:${amount}`,
          admin_id: actor.userId,
          created_at: now,
        },
      });

      return { conflict: false as const };
    });

    if (outcome.conflict) {
      return {
        success: false,
        error: "This credit request has already been reviewed.",
      };
    }
  } catch (error) {
    console.error("[PartnerCredits] Approve error:", error);
    return { success: false, error: "Could not approve credit request." };
  }

  sendPartnerCreditsIssuedEmail({
    to: request.partner.contactEmail,
    partnerName: request.partner.name,
    amount,
    expiresAt: request.partner.expiresAt,
    kind: request.kind as PartnerCreditRequestKind,
  }).catch((err) =>
    console.error("[PartnerCredits] Invite email failed:", err),
  );

  revalidatePartnerViews();
  return { success: true };
}

export async function rejectPartnerCreditRequestAction(
  requestId: string,
  reason?: string,
): Promise<PartnerActionResult> {
  const actor = await getAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };
  if (!uuidSchema.safeParse(requestId).success) {
    return { success: false, error: "Invalid credit request ID." };
  }

  const parsedReason = rejectPartnerRequestSchema.safeParse({
    reason: reason ?? "",
  });
  if (!parsedReason.success) {
    return {
      success: false,
      error:
        parsedReason.error.issues[0]?.message || "Invalid rejection reason.",
    };
  }

  const request = await prisma.partnerCreditRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      partnerId: true,
      kind: true,
      status: true,
      requestedById: true,
    },
  });
  if (!request) {
    return { success: false, error: "Credit request not found." };
  }
  if (request.status !== "pending_approval") {
    return {
      success: false,
      error: "This credit request has already been reviewed.",
    };
  }
  if (request.requestedById === actor.userId) {
    return {
      success: false,
      error: "A second admin must review this credit request.",
    };
  }

  const trimmedReason = parsedReason.data.reason || "Rejected by admin";
  const now = new Date();

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.partnerCreditRequest.updateMany({
        where: { id: requestId, status: "pending_approval" },
        data: {
          status: "rejected",
          reviewedById: actor.userId,
          reviewedAt: now,
          rejectionReason: trimmedReason,
        },
      });
      if (claimed.count !== 1) return false;

      if (request.kind === "initial_grant") {
        await tx.partnerAccount.update({
          where: { id: request.partnerId },
          data: {
            status: "rejected",
            rejectionReason: trimmedReason,
          },
        });
      }

      await tx.logs.create({
        data: {
          action: `partner-credits-rejected:${request.partnerId}`,
          admin_id: actor.userId,
          created_at: now,
        },
      });
      return true;
    });

    if (!updated) {
      return {
        success: false,
        error: "This credit request has already been reviewed.",
      };
    }
  } catch (error) {
    console.error("[PartnerCredits] Reject error:", error);
    return { success: false, error: "Could not reject credit request." };
  }

  revalidatePartnerViews();
  return { success: true };
}

export async function updatePartnerAccountAction(
  partnerId: string,
  input: unknown,
): Promise<PartnerActionResult> {
  const actor = await getAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };
  if (!uuidSchema.safeParse(partnerId).success) {
    return { success: false, error: "Invalid partner ID." };
  }

  const parsed = managePartnerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid partner settings.",
    };
  }

  const partner = await prisma.partnerAccount.findUnique({
    where: { id: partnerId },
    select: { id: true, status: true, creditsIssued: true, creditsUsed: true },
  });
  if (!partner) {
    return { success: false, error: "Partner not found." };
  }
  if (partner.status === "pending_approval" || partner.status === "rejected") {
    return {
      success: false,
      error: "Approve this partner onboarding request before editing it.",
    };
  }

  const data = parsed.data;
  const maxPerCampaign = data.maxPerCampaign
    ? parseCurrencyInput(data.maxPerCampaign)
    : null;
  const topUpAmount = data.topUpAmount
    ? parseCurrencyInput(data.topUpAmount)
    : 0;
  const available = toNum(partner.creditsIssued) - toNum(partner.creditsUsed);
  const nextStatus =
    data.status === "suspended"
      ? "suspended"
      : partner.status === "invited"
        ? "invited"
        : available <= 0
          ? "exhausted"
          : "active";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.partnerAccount.update({
        where: { id: partnerId },
        data: {
          expiresAt: new Date(data.expiresAt),
          eligibleCategories: data.eligibleCategories,
          rulesNote: data.rulesNote || null,
          maxPerCampaign,
          employeeMatchingEnabled: data.employeeMatchingEnabled,
          status: nextStatus,
        },
      });

      if (topUpAmount > 0) {
        await tx.partnerCreditRequest.create({
          data: {
            partnerId,
            kind: "top_up",
            amount: topUpAmount,
            reconciliationRef: data.topUpRef || null,
            note: "Admin top up request",
            status: "pending_approval",
            requestedById: actor.userId,
          },
        });
      }

      await tx.logs.create({
        data: {
          action: `partner-updated:${partnerId}`,
          admin_id: actor.userId,
          created_at: new Date(),
        },
      });
    });
  } catch (error) {
    console.error("[PartnerCredits] Update partner error:", error);
    return { success: false, error: "Could not update partner settings." };
  }

  revalidatePartnerViews();
  return { success: true };
}

async function resolvePartnerForUser(userId: string, email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  const partner = await prisma.partnerAccount.findFirst({
    where: {
      AND: [
        { status: { notIn: ["pending_approval", "rejected"] } },
        normalizedEmail
          ? {
              OR: [
                { userId },
                {
                  AND: [
                    { userId: null },
                    {
                      contactEmail: {
                        equals: normalizedEmail,
                        mode: "insensitive",
                      },
                    },
                  ],
                },
              ],
            }
          : { userId },
      ],
    },
  });

  if (!partner) return null;

  // Never allow an unlinked/invited partner account to be claimed by an unverified email.
  if (!partner.userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    if (!dbUser?.emailVerified) {
      return null;
    }
    const available = toNum(partner.creditsIssued) - toNum(partner.creditsUsed);
    return prisma.partnerAccount.update({
      where: { id: partner.id },
      data: {
        userId,
        status:
          partner.status === "invited"
            ? available <= 0
              ? "exhausted"
              : "active"
            : partner.status,
      },
    });
  }

  if (partner.userId !== userId) {
    return null;
  }

  if (partner.status === "invited") {
    const available = toNum(partner.creditsIssued) - toNum(partner.creditsUsed);
    return prisma.partnerAccount.update({
      where: { id: partner.id },
      data: { status: available <= 0 ? "exhausted" : "active" },
    });
  }

  return partner;
}

export async function getPartnerCreditsDashboard(): Promise<
  PartnerActionResult<PartnerCreditsDashboardData>
> {
  const actor = await getAuthenticatedUser();
  if (!actor.ok) return { success: false, error: actor.error };

  const partner = await resolvePartnerForUser(actor.userId, actor.email);
  if (!partner) {
    return {
      success: true,
      data: {
        partner: null,
        transactions: [],
        pendingTopUpRequests: [],
        eligibleCauses: [],
      },
    };
  }

  const categoryFilter = Array.from(
    categoryTokensFor(partner.eligibleCategories),
  );

  const [transactions, pendingTopUps, causes] = await Promise.all([
    prisma.partnerCreditTransaction.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.partnerCreditRequest.findMany({
      where: {
        partnerId: partner.id,
        kind: "top_up",
        status: "pending_approval",
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cause.findMany({
      where: {
        status: "approved",
        paused: false,
        compliance_paused: false,
        ...(categoryFilter.length > 0
          ? { category: { in: categoryFilter, mode: "insensitive" } }
          : {}),
      },
      select: {
        id: true,
        title: true,
        category: true,
        goal: true,
        raised: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const allocatedByCause = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.causeId && toNum(tx.amount) < 0) {
      allocatedByCause.set(
        tx.causeId,
        (allocatedByCause.get(tx.causeId) ?? 0) + Math.abs(toNum(tx.amount)),
      );
    }
  }

  return {
    success: true,
    data: {
      partner: toPartnerSummary(partner),
      transactions: transactions.map((tx): PartnerCreditTransactionItem => ({
        id: tx.id,
        type: tx.type as PartnerCreditTransactionType,
        amount: toNum(tx.amount),
        causeId: tx.causeId,
        causeTitle: tx.causeTitle,
        showAsSupporter: tx.showAsSupporter,
        note: tx.note,
        createdAt: tx.createdAt.toISOString(),
      })),
      pendingTopUpRequests: pendingTopUps.map((req) => ({
        id: req.id,
        partnerId: req.partnerId,
        partnerName: partner.name,
        partnerEmail: partner.contactEmail,
        kind: req.kind as PartnerCreditRequestKind,
        amount: toNum(req.amount),
        reconciliationRef: req.reconciliationRef,
        note: req.note,
        status: req.status as PartnerCreditRequestStatus,
        requestedById: req.requestedById,
        requesterName: partner.name,
        createdAt: req.createdAt.toISOString(),
      })),
      eligibleCauses: causes.map((cause) => ({
        id: cause.id,
        title: cause.title,
        category: cause.category,
        goal: toNum(cause.goal),
        raised: toNum(cause.raised),
        allocatedByPartner: allocatedByCause.get(cause.id) ?? 0,
      })),
    },
  };
}

interface LockedPartnerRow {
  id: string;
  name: string;
  contact_email: string;
  user_id: string | null;
  status: string;
  eligible_categories: string[];
  max_per_campaign: unknown;
}

export async function allocatePartnerCreditsAction(
  input: unknown,
): Promise<PartnerActionResult> {
  const actor = await getAuthenticatedUser();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = allocateCreditsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid allocation input.",
    };
  }

  const partner = await resolvePartnerForUser(actor.userId, actor.email);
  if (!partner) {
    return { success: false, error: "Partner account not found." };
  }

  const amount = parseCurrencyInput(parsed.data.amount);
  if (amount <= 0) {
    return { success: false, error: "Enter a credit amount greater than ₦0." };
  }
  const { causeId, showAsSupporter } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      // Lock the partner row so concurrent requests serialize per-campaign cap and balance checks.
      const lockedRows = await tx.$queryRaw<LockedPartnerRow[]>`
        SELECT "id", "name", "contact_email", "user_id", "status", "eligible_categories", "max_per_campaign"
        FROM "public"."partner_accounts"
        WHERE "id" = ${partner.id}::uuid
        FOR UPDATE
      `;
      const lockedPartner = lockedRows[0];
      if (!lockedPartner) {
        throw new PartnerDomainError("Partner account not found.");
      }
      if (lockedPartner.status === "suspended") {
        throw new PartnerDomainError(
          "This partner account is suspended. Contact RefreeG support.",
        );
      }

      const cause = await tx.cause.findUnique({
        where: { id: causeId },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          paused: true,
          compliance_paused: true,
        },
      });
      if (!cause) {
        throw new PartnerDomainError("Campaign not found.");
      }
      if (
        cause.status !== "approved" ||
        cause.paused ||
        cause.compliance_paused
      ) {
        throw new PartnerDomainError(
          "This campaign is not open for credit allocations.",
        );
      }

      if (lockedPartner.eligible_categories.length > 0) {
        const allowedTokens = categoryTokensFor(
          lockedPartner.eligible_categories,
        );
        if (!allowedTokens.has(cause.category.trim().toLowerCase())) {
          throw new PartnerDomainError(
            "This campaign is outside your eligible cause categories.",
          );
        }
      }

      if (lockedPartner.max_per_campaign != null) {
        const maxPerCampaign = toNum(lockedPartner.max_per_campaign);
        const priorAgg = await tx.partnerCreditTransaction.aggregate({
          where: {
            partnerId: lockedPartner.id,
            causeId,
            type: { in: ["allocation", "employee_match"] },
          },
          _sum: { amount: true },
        });
        const priorUsedOnCause = Math.abs(toNum(priorAgg._sum.amount));
        if (priorUsedOnCause + amount > maxPerCampaign) {
          const remainingForCause = Math.max(
            0,
            maxPerCampaign - priorUsedOnCause,
          );
          throw new PartnerDomainError(
            `Exceeds your ₦${maxPerCampaign.toLocaleString("en-NG")} per-campaign limit (₦${remainingForCause.toLocaleString("en-NG")} left for this campaign).`,
          );
        }
      }

      const updatedRows = await tx.$executeRaw`
        UPDATE "public"."partner_accounts"
        SET "credits_used" = "credits_used" + ${amount}::decimal,
            "status" = CASE
              WHEN ("credits_issued" - ("credits_used" + ${amount}::decimal)) <= 0 THEN 'exhausted'
              ELSE 'active'
            END,
            "updated_at" = NOW()
        WHERE "id" = ${lockedPartner.id}::uuid
          AND "status" IN ('active', 'invited')
          AND ("credits_issued" - "credits_used") >= ${amount}::decimal
      `;

      if (updatedRows !== 1) {
        throw new PartnerDomainError("Insufficient partner credits available.");
      }

      const donation = await tx.donation.create({
        data: {
          causeId,
          userId: lockedPartner.user_id ?? actor.userId,
          amount,
          name: showAsSupporter ? lockedPartner.name : "Anonymous",
          email: lockedPartner.contact_email,
          message: "Allocated via RefreeG Partner Credits",
          is_anonymous: !showAsSupporter,
          status: "completed",
          payment_provider: "partner_credit",
          paystack_reference: `partner_credit_${crypto.randomUUID()}`,
        },
        select: { id: true },
      });

      await tx.cause.update({
        where: { id: causeId },
        data: { raised: { increment: amount } },
      });

      await tx.partnerCreditTransaction.create({
        data: {
          partnerId: lockedPartner.id,
          type: "allocation",
          amount: -amount,
          causeId,
          causeTitle: cause.title,
          donationId: donation.id,
          showAsSupporter,
          note: showAsSupporter
            ? "Shown as supporter on campaign"
            : "Allocated privately",
          createdById: actor.userId,
        },
      });
    });
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return { success: false, error: err.message };
    }
    console.error("[PartnerCredits] Allocation error:", err);
    return { success: false, error: "Could not allocate credits." };
  }

  revalidatePartnerViews(causeId);
  return { success: true };
}

export async function requestPartnerTopUpAction(
  input: unknown,
): Promise<PartnerActionResult> {
  const actor = await getAuthenticatedUser();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = requestTopUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid top up request.",
    };
  }

  const partner = await resolvePartnerForUser(actor.userId, actor.email);
  if (!partner) {
    return { success: false, error: "Partner account not found." };
  }
  if (partner.status === "suspended") {
    return {
      success: false,
      error: "Suspended partner accounts cannot request top ups.",
    };
  }

  const amount = parseCurrencyInput(parsed.data.amount);
  if (amount <= 0) {
    return { success: false, error: "Enter a credit amount greater than ₦0." };
  }

  try {
    await prisma.partnerCreditRequest.create({
      data: {
        partnerId: partner.id,
        kind: "top_up",
        amount,
        reconciliationRef: parsed.data.reconciliationRef || null,
        note: parsed.data.note || "Partner top up request",
        status: "pending_approval",
        requestedById: actor.userId,
      },
    });
  } catch (error) {
    console.error("[PartnerCredits] Request top up error:", error);
    return { success: false, error: "Could not submit top up request." };
  }

  revalidatePartnerViews();
  return { success: true };
}
