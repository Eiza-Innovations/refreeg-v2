"use server";

import { prisma } from "@/lib/prisma";
import { deviceFrom, failureReason } from "@/lib/campaign-analytics/funnel";
import type { FunnelEventInput } from "@/lib/schemas/campaign-analytics.schema";

export async function recordFunnelEvent(
  input: FunnelEventInput & { userId: string | null; userAgent: string | null },
) {
  const [cause, priorGifts] = await Promise.all([
    prisma.cause.findUnique({
      where: { id: input.causeId },
      select: { id: true },
    }),
    input.userId
      ? prisma.donation.count({
          where: { userId: input.userId, status: "completed" },
        })
      : null,
  ]);
  if (!cause) return;
  const firstTime = priorGifts === null ? null : priorGifts === 0;

  await prisma.campaign_funnel_events.createMany({
    data: [
      {
        cause_id: input.causeId,
        session_id: input.sessionId,
        step: input.step,
        amount: input.amount,
        reference: input.reference,
        user_id: input.userId,
        first_time: firstTime,
        device: deviceFrom(input.userAgent),
      },
    ],
    skipDuplicates: true,
  });
}

/** Closes the funnel for a payment started on the web: paid, or failed with a reason. */
export async function recordPaymentOutcome(
  reference: string,
  data: { status?: string; channel?: string; gateway_response?: string },
) {
  const started = await prisma.campaign_funnel_events.findFirst({
    where: { reference, step: "payment" },
  });
  if (!started) return;

  const paid = data.status === "success";
  await prisma.campaign_funnel_events.createMany({
    data: [
      {
        cause_id: started.cause_id,
        session_id: started.session_id,
        step: paid ? "paid" : "failed",
        reason: paid ? null : failureReason(data),
        device: started.device,
        amount: started.amount,
        reference,
        user_id: started.user_id,
        first_time: started.first_time,
      },
    ],
    skipDuplicates: true,
  });
}
