"use server";

import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";
import { requireAdminOrManager } from "@/lib/auth/admin-auth";
import { prisma } from "@/lib/prisma";
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

const EMAIL_BATCH_SIZE = 50;

export async function takeDownCampaign(input: TakedownCampaignInput) {
  const actor = await requireAdminOrManager();
  const parsed = takedownCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      data: null,
    };
  }
  const form = parsed.data;
  const now = new Date();

  const outcome = await prisma.$transaction(async (tx) => {
    const updated = await tx.cause.updateMany({
      where: { id: form.causeId, status: { not: "removed" } },
      data: {
        status: "removed",
        compliance_paused: true,
        compliance_paused_at: now,
      },
    });
    if (updated.count === 0) return null;

    const [cause, donors] = await Promise.all([
      tx.cause.findUnique({
        where: { id: form.causeId },
        select: { title: true, userId: true, raised: true },
      }),
      tx.donation.findMany({
        where: { causeId: form.causeId, status: "completed" },
        select: { email: true },
        distinct: ["email"],
      }),
    ]);
    if (!cause) return null;

    if (form.suspendCreator) {
      await tx.user.updateMany({
        where: { id: cause.userId, isBlocked: false },
        data: { isBlocked: true },
      });
    }

    await tx.admin_audit_entries.create({
      data: {
        id: randomUUID(),
        actor_id: actor.id,
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
    });

    return {
      title: cause.title,
      emails: donors.map((d) => d.email).filter(Boolean),
    };
  });

  if (!outcome) {
    return {
      success: false,
      error: "Campaign not found or already taken down",
      data: null,
    };
  }

  if (form.notifyDonors && outcome.emails.length > 0) {
    const reasonLabel =
      takedownReasonOptions.find((option) => option.value === form.reason)
        ?.label ?? "it broke our rules";
    const refundLine =
      form.funds === "refund"
        ? "Our team has queued your gift for refund review and will update you once processed."
        : "Gifts are being held while the case is investigated.";
    for (let i = 0; i < outcome.emails.length; i += EMAIL_BATCH_SIZE) {
      void sendCampaignRemovedDonorEmail({
        bcc: outcome.emails.slice(i, i + EMAIL_BATCH_SIZE),
        causeTitle: outcome.title,
        reasonLabel,
        refundLine,
      }).catch((err) => console.error("Donor removal email failed:", err));
    }
  }

  revalidateTag(CAMPAIGN_ANALYTICS_TAG);
  return {
    success: true,
    error: null,
    data: {
      title: outcome.title,
      donors: outcome.emails.length,
      funds: form.funds,
    },
  };
}

export async function setCampaignRiskState(input: CampaignRiskActionInput) {
  const actor = await requireAdminOrManager();
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

  const updatedCount = await prisma.$transaction(async (tx) => {
    // A missed proof deadline keeps the campaign paused even after risk is cleared.
    const proofOverdue = await tx.campaign_proof_requirements.count({
      where: {
        cause_id: causeId,
        status: "pending",
        deadline: { lt: new Date() },
      },
    });
    const updated = await tx.cause.updateMany({
      where: { id: causeId },
      data: {
        compliance_paused: freeze || proofOverdue > 0,
        compliance_paused_at: freeze
          ? new Date()
          : proofOverdue > 0
            ? undefined
            : null,
      },
    });
    if (updated.count === 0) return 0;

    await tx.admin_audit_entries.create({
      data: {
        id: randomUUID(),
        actor_id: actor.id,
        action: freeze ? AUDIT_FROZEN : AUDIT_CLEARED,
        kind: "cause",
        target_id: causeId,
      },
    });
    return updated.count;
  });

  if (updatedCount === 0) {
    return { success: false, error: "Campaign not found", data: null };
  }

  revalidateTag(CAMPAIGN_ANALYTICS_TAG);
  return { success: true, error: null, data: { action } };
}
