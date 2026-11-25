"use server";

import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  readReport,
  requireReviewer,
  UNAUTHORIZED,
} from "@/lib/admin/report-access";
import { getCampaignOverviewData } from "@/lib/campaign-analytics/overview";
import { getVelocityData } from "@/lib/campaign-analytics/velocity";
import { getDropOffData } from "@/lib/campaign-analytics/funnel";
import { getFraudRiskData } from "@/lib/campaign-analytics/fraud-signals";
import {
  AUDIT_CLEARED,
  AUDIT_FROZEN,
  AUDIT_TAKEN_DOWN,
} from "@/lib/campaign-analytics/risk-levels";
import { CAMPAIGN_ANALYTICS_TAG } from "@/lib/campaign-analytics/shared";
import { takedownReasonOptions } from "@/lib/options/campaign-analytics.options";
import {
  campaignRiskActionSchema,
  takedownCampaignSchema,
  type CampaignRiskActionInput,
  type TakedownCampaignInput,
} from "@/lib/schemas/campaign-analytics.schema";
import { sendCampaignRemovedDonorEmail } from "@/services/mail";
import type { AnalyticsPeriod } from "@/types/campaign-analytics-types";

export async function getCampaignOverview(period: AnalyticsPeriod) {
  return readReport(period, () => getCampaignOverviewData(period));
}

export async function getFundingVelocity(period: AnalyticsPeriod) {
  return readReport(period, () => getVelocityData(period));
}

export async function getCampaignDropOff(period: AnalyticsPeriod) {
  return readReport(period, () => getDropOffData(period));
}

export async function getFraudRisk() {
  return readReport(null, () => getFraudRiskData());
}

export async function takeDownCampaign(input: TakedownCampaignInput) {
  const actorId = await requireReviewer();
  if (!actorId) return UNAUTHORIZED;
  const parsed = takedownCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      data: null,
    };
  }
  const form = parsed.data;

  const cause = await prisma.cause.findUnique({
    where: { id: form.causeId },
    select: { title: true, status: true, userId: true, raised: true },
  });
  if (!cause)
    return { success: false, error: "Campaign not found", data: null };
  if (cause.status === "removed") {
    return {
      success: false,
      error: "This campaign is already taken down",
      data: null,
    };
  }

  const donors = await prisma.donation.findMany({
    where: { causeId: form.causeId, status: "completed" },
    select: { email: true },
    distinct: ["email"],
  });
  const now = new Date();

  await prisma.$transaction([
    prisma.cause.update({
      where: { id: form.causeId },
      data: {
        status: "removed",
        compliance_paused: true,
        compliance_paused_at: now,
      },
    }),
    ...(form.suspendCreator
      ? [
          prisma.user.update({
            where: { id: cause.userId },
            data: { isBlocked: true },
          }),
        ]
      : []),
    prisma.admin_audit_entries.create({
      data: {
        id: randomUUID(),
        actor_id: actorId,
        action: AUDIT_TAKEN_DOWN,
        kind: "cause",
        target_id: form.causeId,
        metadata: {
          reason: form.reason,
          note: form.note,
          funds: form.funds === "refund" ? "refund_pending" : "held",
          raised: Number(cause.raised ?? 0),
          donors: donors.length,
          suspendCreator: form.suspendCreator,
          notifyDonors: form.notifyDonors,
        },
      },
    }),
  ]);

  if (form.notifyDonors) {
    const reasonLabel =
      takedownReasonOptions.find((option) => option.value === form.reason)
        ?.label ?? "it broke our rules";
    void sendCampaignRemovedDonorEmail({
      bcc: donors.map((donor) => donor.email).filter(Boolean),
      causeTitle: cause.title,
      reasonLabel,
      refundLine:
        form.funds === "refund"
          ? "Your gift will be refunded to how you paid."
          : "Gifts are being held while the case is investigated.",
    });
  }

  revalidateTag(CAMPAIGN_ANALYTICS_TAG);
  return {
    success: true,
    error: null,
    data: { title: cause.title, donors: donors.length, funds: form.funds },
  };
}

export async function setCampaignRiskState(input: CampaignRiskActionInput) {
  const actorId = await requireReviewer();
  if (!actorId) return UNAUTHORIZED;
  const parsed = campaignRiskActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      data: null,
    };
  }
  const { causeId, action } = parsed.data;
  const freeze = action === "freeze";
  // A missed proof deadline keeps the campaign paused even after risk is cleared.
  const proofOverdue = await prisma.campaign_proof_requirements.count({
    where: {
      cause_id: causeId,
      status: "pending",
      deadline: { lt: new Date() },
    },
  });

  await prisma.$transaction([
    prisma.cause.update({
      where: { id: causeId },
      data: {
        compliance_paused: freeze || proofOverdue > 0,
        compliance_paused_at: freeze
          ? new Date()
          : proofOverdue > 0
            ? undefined
            : null,
      },
    }),
    prisma.admin_audit_entries.create({
      data: {
        id: randomUUID(),
        actor_id: actorId,
        action: freeze ? AUDIT_FROZEN : AUDIT_CLEARED,
        kind: "cause",
        target_id: causeId,
      },
    }),
  ]);

  revalidateTag(CAMPAIGN_ANALYTICS_TAG);
  return { success: true, error: null, data: { action } };
}
