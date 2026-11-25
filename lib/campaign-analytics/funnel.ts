import {
  funnelSegmentOptions,
  funnelStepOptions,
} from "@/lib/options/campaign-analytics.options";
import type {
  FunnelSegmentRow,
  FunnelStep,
} from "@/types/campaign-analytics-types";

const steps = funnelStepOptions.map((option) => option.value);

export const deviceFrom = (userAgent: string | null) => {
  if (!userAgent) return null;
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/mobile/i.test(userAgent)) return "mobile";
  return "desktop";
};

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
