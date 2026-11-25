import type { AnalyticsPeriod } from "@/types/campaign-analytics-types";

// Reporting windows follow Lagos wall-clock time (WAT, UTC+1, no DST).
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export type ReportingWindow = {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  days: number;
  label: string;
};

const fromLagos = (y: number, m: number, d = 1) =>
  new Date(Date.UTC(y, m, d) - LAGOS_OFFSET_MS);

/** Period to date vs the same span of the period before. */
export function reportingWindow(
  period: AnalyticsPeriod,
  now = new Date(),
): ReportingWindow {
  const lagos = new Date(now.getTime() + LAGOS_OFFSET_MS);
  const y = lagos.getUTCFullYear();
  const m = lagos.getUTCMonth();
  const d = lagos.getUTCDate();

  const [from, previousFrom, label] =
    period === "day"
      ? [fromLagos(y, m, d), fromLagos(y, m, d - 1), "Today"]
      : period === "month"
        ? [
            fromLagos(y, m),
            fromLagos(y, m - 1),
            lagos.toLocaleString("en-NG", { month: "long", timeZone: "UTC" }),
          ]
        : [fromLagos(y, 0), fromLagos(y - 1, 0), String(y)];

  const span = now.getTime() - from.getTime();
  const previousTo = new Date(
    Math.min(previousFrom.getTime() + span, from.getTime()),
  );

  return {
    from,
    to: now,
    previousFrom,
    previousTo,
    days: Math.max(1, Math.ceil(span / DAY_MS)),
    label,
  };
}
