import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { reportingWindow } from "@/lib/campaign-analytics/period";
import { CAMPAIGN_ANALYTICS_TAG } from "@/lib/campaign-analytics/shared";
import {
  BIG_GIFT_AMOUNT,
  funnelSegmentOptions,
  funnelStepOptions,
} from "@/lib/options/campaign-analytics.options";
import type { FunnelEventInput } from "@/lib/schemas/campaign-analytics.schema";
import type {
  AnalyticsPeriod,
  DropOffReport,
  FunnelSegmentRow,
  FunnelStep,
} from "@/types/campaign-analytics-types";

const steps = funnelStepOptions.map((option) => option.value);

const deviceFrom = (userAgent: string | null) => {
  if (!userAgent) return null;
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/mobile/i.test(userAgent)) return "mobile";
  return "desktop";
};

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

/** Paystack verify payload → why a gift didn't complete. */
export const failureReason = (data: {
  status?: string;
  channel?: string;
  gateway_response?: string;
}) => {
  if (/time(d)? ?out/i.test(data.gateway_response ?? "")) return "timeout";
  if (["bank_transfer", "bank", "ussd"].includes(data.channel ?? "")) {
    return "transfer_incomplete";
  }
  return data.status === "abandoned" ? "abandoned" : "card_declined";
};

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

type SegmentCounts = Record<FunnelStep, number>;
export type SegmentRow = SegmentCounts & {
  device: string | null;
  big_gift: boolean | null;
  first_time: boolean | null;
  no_photo: boolean;
};

const segmentMatchers: Record<
  (typeof funnelSegmentOptions)[number]["value"],
  (row: SegmentRow) => boolean
> = {
  android: (row) => row.device === "android",
  ios: (row) => row.device === "ios",
  big_gift: (row) => row.big_gift === true,
  first_time: (row) => row.first_time === true,
  no_photo: (row) => row.no_photo,
};

const totals = (rows: SegmentRow[]) =>
  Object.fromEntries(
    steps.map((step) => [
      step,
      rows.reduce((sum, row) => sum + Number(row[step]), 0),
    ]),
  ) as SegmentCounts;

/** Worst step for each segment, as change in step conversion vs everyone. */
export function worstSteps(rows: SegmentRow[]): FunnelSegmentRow[] {
  const all = totals(rows);
  return funnelSegmentOptions.flatMap(({ label, value }) => {
    const seg = totals(rows.filter(segmentMatchers[value]));
    const drops = steps.slice(1).flatMap((step, index) => {
      const before = steps[index];
      if (!seg[before] || !all[before] || !all[step]) return [];
      const rate = seg[step] / seg[before];
      const base = all[step] / all[before];
      return [{ step, drop: (rate - base) / base }];
    });
    const worst = drops.sort((a, b) => a.drop - b.drop)[0];
    return worst && worst.drop < 0
      ? [{ segment: label, step: worst.step, dropVsAverage: worst.drop * 100 }]
      : [];
  });
}

async function loadDropOff(period: AnalyticsPeriod): Promise<DropOffReport> {
  const w = reportingWindow(period);

  const [stepRows, reasonRows, segmentRows] = await Promise.all([
    prisma.$queryRaw<{ step: string; current: number; previous: number }[]>`
      SELECT step,
        COUNT(*) FILTER (WHERE created_at >= ${w.from} AND created_at < ${w.to})::int AS current,
        COUNT(*) FILTER (WHERE created_at >= ${w.previousFrom} AND created_at < ${w.previousTo})::int AS previous
      FROM campaign_funnel_events
      WHERE created_at >= ${w.previousFrom}
      GROUP BY step`,
    prisma.$queryRaw<{ reason: string; sessions: number }[]>`
      SELECT f.reason, COUNT(*)::int AS sessions
      FROM campaign_funnel_events f
      WHERE f.step = 'failed' AND f.created_at >= ${w.from} AND f.created_at < ${w.to}
        AND NOT EXISTS (
          SELECT 1 FROM campaign_funnel_events p
          WHERE p.step = 'paid' AND p.session_id = f.session_id AND p.cause_id = f.cause_id
        )
      GROUP BY f.reason ORDER BY sessions DESC`,
    prisma.$queryRaw<SegmentRow[]>`
      WITH s AS (
        SELECT session_id, cause_id, MAX(device) AS device,
          MAX(amount) > ${BIG_GIFT_AMOUNT} AS big_gift, BOOL_OR(first_time) AS first_time,
          BOOL_OR(step = 'view') AS view, BOOL_OR(step = 'give') AS give,
          BOOL_OR(step = 'amount') AS amount, BOOL_OR(step = 'payment') AS payment,
          BOOL_OR(step = 'paid') AS paid
        FROM campaign_funnel_events
        WHERE created_at >= ${w.from} AND created_at < ${w.to}
        GROUP BY session_id, cause_id
      )
      SELECT s.device, s.big_gift, s.first_time,
        (c.image IS NULL OR c.image = '') AS no_photo,
        COUNT(*) FILTER (WHERE s.view)::int AS view,
        COUNT(*) FILTER (WHERE s.give)::int AS give,
        COUNT(*) FILTER (WHERE s.amount)::int AS amount,
        COUNT(*) FILTER (WHERE s.payment)::int AS payment,
        COUNT(*) FILTER (WHERE s.paid)::int AS paid
      FROM s JOIN causes c ON c.id = s.cause_id
      GROUP BY 1, 2, 3, 4`,
  ]);

  const byStep = new Map(stepRows.map((row) => [row.step, row]));
  return {
    steps: steps.map((step) => ({
      step,
      sessions: byStep.get(step)?.current ?? 0,
      previous: byStep.get(step)?.previous ?? 0,
    })),
    reasons: reasonRows.map((row) => ({
      reason: row.reason,
      sessions: row.sessions,
    })),
    segments: worstSteps(segmentRows),
  };
}

export const getDropOffData = unstable_cache(
  loadDropOff,
  ["campaign-analytics-drop-off"],
  { revalidate: 300, tags: [CAMPAIGN_ANALYTICS_TAG] },
);
