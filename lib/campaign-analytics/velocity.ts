import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DAY_MS, reportingWindow } from "@/lib/campaign-analytics/period";
import {
  CAMPAIGN_ANALYTICS_TAG,
  giftsSql,
  ownerName,
  ownerSelect,
} from "@/lib/campaign-analytics/shared";
import type {
  AnalyticsPeriod,
  VelocityForecast,
  VelocityRow,
} from "@/types/campaign-analytics-types";

const SPARK_DAYS = 14;
const ENDED_LOOKBACK_DAYS = 90;

function forecastFor(row: {
  raised: number;
  goal: number;
  perDay: number;
  daysLeft: number | null;
  lastWeek: number;
}): { forecast: VelocityForecast; shortBy: number } {
  if (row.raised >= row.goal) return { forecast: "will-hit", shortBy: 0 };
  if (row.lastWeek === 0) return { forecast: "stalled", shortBy: 0 };
  if (row.daysLeft == null) return { forecast: "open", shortBy: 0 };
  const shortBy = row.goal - (row.raised + row.perDay * row.daysLeft);
  return shortBy <= 0
    ? { forecast: "will-hit", shortBy: 0 }
    : { forecast: "short", shortBy };
}

async function loadVelocity(period: AnalyticsPeriod): Promise<VelocityRow[]> {
  const w = reportingWindow(period);
  const now = Date.now();
  const sparkFrom = new Date(now - SPARK_DAYS * DAY_MS);

  const [causes, sums, daily] = await Promise.all([
    prisma.cause.findMany({
      where: {
        status: "approved",
        goal: { gt: 0 },
        OR: [
          { end_date: null },
          { end_date: { gte: new Date(now - ENDED_LOOKBACK_DAYS * DAY_MS) } },
        ],
      },
      select: {
        id: true,
        title: true,
        category: true,
        goal: true,
        raised: true,
        end_date: true,
        compliance_paused: true,
        user: { select: ownerSelect },
      },
    }),
    prisma.$queryRaw<
      { cause_id: string; current: number | null; previous: number | null }[]
    >`
      WITH g AS (${giftsSql})
      SELECT cause_id,
        SUM(amount) FILTER (WHERE created_at >= ${w.from} AND created_at < ${w.to}) AS current,
        SUM(amount) FILTER (WHERE created_at >= ${w.previousFrom} AND created_at < ${w.previousTo}) AS previous
      FROM g WHERE created_at >= ${w.previousFrom}
      GROUP BY cause_id`,
    prisma.$queryRaw<{ cause_id: string; ago: number; amount: number }[]>`
      WITH g AS (${giftsSql})
      SELECT cause_id, FLOOR(EXTRACT(EPOCH FROM now() - created_at) / 86400)::int AS ago,
        SUM(amount) AS amount
      FROM g WHERE created_at >= ${sparkFrom}
      GROUP BY 1, 2`,
  ]);

  const sumsById = new Map(sums.map((row) => [row.cause_id, row]));
  const dailyById = new Map<string, number[]>();
  for (const row of daily) {
    const series = dailyById.get(row.cause_id) ?? Array(SPARK_DAYS).fill(0);
    const index = SPARK_DAYS - 1 - Number(row.ago);
    if (index >= 0) series[index] += Number(row.amount);
    dailyById.set(row.cause_id, series);
  }

  return causes
    .map((cause) => {
      const goal = Number(cause.goal);
      const raised = Number(cause.raised ?? 0);
      const sum = sumsById.get(cause.id);
      const perDay = Number(sum?.current ?? 0) / w.days;
      const series = dailyById.get(cause.id) ?? Array(SPARK_DAYS).fill(0);
      const endsAt = cause.end_date?.getTime() ?? null;
      const ended = endsAt != null && endsAt < now;
      const daysLeft =
        endsAt == null ? null : Math.max(0, Math.ceil((endsAt - now) / DAY_MS));
      return {
        id: cause.id,
        title: cause.title,
        owner: ownerName(cause.user),
        category: cause.category,
        state: cause.compliance_paused
          ? ("frozen" as const)
          : ended
            ? ("ended" as const)
            : ("live" as const),
        raised,
        goal,
        perDay,
        previousPerDay: Number(sum?.previous ?? 0) / w.days,
        daily: series,
        daysLeft,
        ...forecastFor({
          raised,
          goal,
          perDay,
          daysLeft,
          lastWeek: series.slice(-7).reduce((total, value) => total + value, 0),
        }),
      };
    })
    .sort((a, b) => b.perDay - a.perDay);
}

export const getVelocityData = unstable_cache(
  loadVelocity,
  ["campaign-analytics-velocity"],
  { revalidate: 300, tags: [CAMPAIGN_ANALYTICS_TAG] },
);
