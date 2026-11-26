const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 412000 → "412k", 1200000 → "1.2m". */
export const formatCount = (value: number) =>
  compact.format(value).toLowerCase();

export const formatNairaCompact = (value: number) =>
  `₦${compact.format(Math.round(value)).toLowerCase()}`;

/** Percent change from previous to current; null when there's nothing to compare. */
export const percentChange = (
  current: number | null,
  previous: number | null,
) =>
  current == null || !previous ? null : ((current - previous) / previous) * 100;

export const signedPercent = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(Math.round(value))}%`;

/** 0.4 → "<1h", 30 → "30h", 70 → "2.9d". */
export const formatHours = (hours: number | null) =>
  hours == null
    ? "—"
    : hours < 1
      ? "<1h"
      : hours < 48
        ? `${Math.round(hours)}h`
        : `${(hours / 24).toFixed(1)}d`;

export const periodBucketName = {
  day: "hour",
  month: "day",
  year: "month",
} as const;
