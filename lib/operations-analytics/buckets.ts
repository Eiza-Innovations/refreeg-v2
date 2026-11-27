import type {
  AnalyticsPeriod,
  ReportingWindow,
} from "@/types/campaign-analytics-types";
import type { Series } from "@/types/operations-analytics-types";

const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type Unit = "hour" | "day" | "month";
const unitFor: Record<AnalyticsPeriod, Unit> = {
  day: "hour",
  month: "day",
  year: "month",
};

const pad = (value: number) => String(value).padStart(2, "0");

/** Bucket key in Lagos wall-clock time, matching `bucketKeys`. */
export function bucketKeyFor(period: AnalyticsPeriod, date: Date): string {
  const lagos = new Date(date.getTime() + LAGOS_OFFSET_MS);
  const y = lagos.getUTCFullYear();
  const m = pad(lagos.getUTCMonth() + 1);
  const d = period === "year" ? "01" : pad(lagos.getUTCDate());
  const h = period === "day" ? pad(lagos.getUTCHours()) : "00";
  return `${y}-${m}-${d}T${h}`;
}

export function countBuckets(period: AnalyticsPeriod, dates: Date[]) {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = bucketKeyFor(period, date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([bucket, count]) => ({ bucket, count }));
}

/** Every bucket from the window start to now, with labels and the current one marked. */
function bucketKeys(period: AnalyticsPeriod, w: ReportingWindow) {
  const unit = unitFor[period];
  const cursor = new Date(w.from.getTime() + LAGOS_OFFSET_MS);
  const end = new Date(w.to.getTime() + LAGOS_OFFSET_MS);
  const keys: string[] = [];
  const labels: string[] = [];
  while (cursor <= end) {
    keys.push(
      `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(cursor.getUTCDate())}T${pad(cursor.getUTCHours())}`,
    );
    labels.push(
      unit === "hour"
        ? `${pad(cursor.getUTCHours())}:00`
        : unit === "day"
          ? String(cursor.getUTCDate())
          : MONTHS[cursor.getUTCMonth()],
    );
    if (unit === "hour") cursor.setUTCHours(cursor.getUTCHours() + 1);
    else if (unit === "day") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return { keys, labels };
}

export function toSeries(
  period: AnalyticsPeriod,
  w: ReportingWindow,
  rows: { bucket: string; count: number }[],
): Series {
  const { keys, labels } = bucketKeys(period, w);
  const byBucket = new Map(rows.map((row) => [row.bucket, Number(row.count)]));
  return {
    labels,
    values: keys.map((key) => byBucket.get(key) ?? 0),
    currentIndex: Math.max(0, keys.length - 1),
  };
}
