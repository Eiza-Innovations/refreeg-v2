import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deviceFrom, failureReason } from "@/lib/campaign-analytics/funnel";
import type { FunnelEventInput } from "@/lib/schemas/campaign-analytics.schema";

const isDuplicate = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

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

  try {
    await prisma.campaign_funnel_events.create({
      data: {
        cause_id: input.causeId,
        session_id: input.sessionId,
        step: input.step,
        amount: input.amount,
        reference: input.reference,
        user_id: input.userId,
        first_time: firstTime,
        device: deviceFrom(input.userAgent),
      },
    });
  } catch (error) {
    if (!isDuplicate(error)) throw error;
  }
}

/** Closes the funnel for a payment started on the web: paid, or failed with a reason. */
export async function recordPaymentOutcome(
  reference: string,
  data: { status?: string; channel?: string; gateway_response?: string },
) {
  const started = await prisma.campaign_funnel_events.findFirst({
    where: { reference, step: "payment" },
    orderBy: { created_at: "desc" },
  });
  if (!started) return;

  const paid = data.status === "success";
  try {
    await prisma.campaign_funnel_events.create({
      data: {
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
    });
  } catch (error) {
    if (!isDuplicate(error)) throw error;
  }
}
