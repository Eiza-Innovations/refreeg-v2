"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { isAdminOrManager } from "@/actions/admin/role-actions";
import { reviewQueueWhere } from "@/lib/admin/review-queues";
import { runHealthChecks } from "@/lib/health/checks";

/** Sidebar badges and the top bar's system status for the admin shell. */
export async function getAdminShellSummary() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !(await isAdminOrManager(userId))) {
    return { success: false, error: "Unauthorized", data: null };
  }

  const [campaigns, kyc, receipts, petitions, health] = await Promise.all([
    prisma.cause.count({ where: reviewQueueWhere.campaigns }),
    prisma.kyc_verifications.count({ where: reviewQueueWhere.kyc }),
    prisma.campaign_proof_updates.count({ where: reviewQueueWhere.receipts }),
    prisma.petitions.count({ where: reviewQueueWhere.petitions }),
    runHealthChecks(),
  ]);

  return {
    success: true,
    error: null,
    data: {
      counts: { campaigns, kyc, receipts, petitions },
      systemsNormal: health.status === "operational",
    },
  };
}
