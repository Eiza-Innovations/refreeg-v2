import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DAY_MS, reportingWindow } from "@/lib/campaign-analytics/period";
import {
  CAMPAIGN_ANALYTICS_TAG,
  giftsSql,
  launchedAtSql,
} from "@/lib/campaign-analytics/shared";
import { getFraudRiskData } from "@/lib/campaign-analytics/fraud-signals";
import { RISK_HIGH } from "@/lib/campaign-analytics/risk-levels";
import type {
  AnalyticsPeriod,
  CampaignOverview,
} from "@/types/campaign-analytics-types";

const CURVE_DAYS = 30;

type KpiRow = { current: number | null; previous: number | null };

async function loadOverview(
  period: AnalyticsPeriod,
): Promise<CampaignOverview> {
  const w = reportingWindow(period);
  const yearBefore = new Date(w.from.getTime() - 365 * DAY_MS);
  const inCurrent = (column: Prisma.Sql) =>
    Prisma.sql`${column} >= ${w.from} AND ${column} < ${w.to}`;
  const inPrevious = (column: Prisma.Sql) =>
    Prisma.sql`${column} >= ${w.previousFrom} AND ${column} < ${w.previousTo}`;

  const [success, velocity, toGoal, curve, risk] = await Promise.all([
    prisma.$queryRaw<KpiRow[]>`
      SELECT
        100.0 * COUNT(*) FILTER (WHERE ${inCurrent(Prisma.sql`end_date`)} AND COALESCE(raised, 0) >= goal)
          / NULLIF(COUNT(*) FILTER (WHERE ${inCurrent(Prisma.sql`end_date`)}), 0) AS current,
        100.0 * COUNT(*) FILTER (WHERE ${inPrevious(Prisma.sql`end_date`)} AND COALESCE(raised, 0) >= goal)
          / NULLIF(COUNT(*) FILTER (WHERE ${inPrevious(Prisma.sql`end_date`)}), 0) AS previous
      FROM causes WHERE status = 'approved' AND goal > 0`,
    prisma.$queryRaw<KpiRow[]>`
      WITH g AS (${giftsSql}),
      per_cause AS (
        SELECT cause_id,
          SUM(amount) FILTER (WHERE ${inCurrent(Prisma.sql`created_at`)}) AS current,
          SUM(amount) FILTER (WHERE ${inPrevious(Prisma.sql`created_at`)}) AS previous
        FROM g GROUP BY cause_id
      )
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY current) FILTER (WHERE current > 0) / ${w.days} AS current,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY previous) FILTER (WHERE previous > 0) / ${w.days} AS previous
      FROM per_cause`,
    prisma.$queryRaw<KpiRow[]>`
      WITH g AS (${giftsSql}),
      running AS (
        SELECT g.cause_id, g.created_at, c.goal::float8 AS goal, ${launchedAtSql} AS launched,
          SUM(g.amount) OVER (PARTITION BY g.cause_id ORDER BY g.created_at ROWS UNBOUNDED PRECEDING) AS cum
        FROM g JOIN causes c ON c.id = g.cause_id
        WHERE c.status = 'approved' AND c.goal > 0
      ),
      crossed AS (
        SELECT cause_id, MIN(created_at) AS reached_at, MIN(launched) AS launched
        FROM running WHERE cum >= goal GROUP BY cause_id
      )
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM reached_at - launched) / 86400)
          FILTER (WHERE ${inCurrent(Prisma.sql`reached_at`)}) AS current,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM reached_at - launched) / 86400)
          FILTER (WHERE ${inPrevious(Prisma.sql`reached_at`)}) AS previous
      FROM crossed`,
    prisma.$queryRaw<
      { day: number; cohort: number | null; average: number | null }[]
    >`
      WITH g AS (${giftsSql}),
      c AS (
        SELECT c.id, c.goal::float8 AS goal, ${launchedAtSql} AS launched,
          ${launchedAtSql} >= ${w.from} AS in_cohort
        FROM causes c
        WHERE c.status = 'approved' AND c.goal > 0
          AND ${launchedAtSql} >= ${yearBefore} AND ${launchedAtSql} < ${w.to}
      ),
      daily AS (
        SELECT g.cause_id, GREATEST(0, FLOOR(EXTRACT(EPOCH FROM g.created_at - c.launched) / 86400))::int AS day,
          SUM(g.amount) AS amount
        FROM g JOIN c ON c.id = g.cause_id GROUP BY 1, 2
      ),
      grid AS (
        SELECT c.id, c.goal, c.in_cohort, s.day
        FROM c CROSS JOIN generate_series(0, ${CURVE_DAYS - 1}) AS s(day)
        WHERE c.launched + s.day * interval '1 day' <= now()
      ),
      filled AS (
        SELECT grid.day, grid.in_cohort, grid.goal,
          SUM(COALESCE(daily.amount, 0)) OVER (PARTITION BY grid.id ORDER BY grid.day) AS cum
        FROM grid LEFT JOIN daily ON daily.cause_id = grid.id AND daily.day = grid.day
      )
      SELECT day,
        100 * AVG(LEAST(cum / goal, 1.5)) FILTER (WHERE in_cohort) AS cohort,
        100 * AVG(LEAST(cum / goal, 1.5)) FILTER (WHERE NOT in_cohort) AS average
      FROM filled GROUP BY day ORDER BY day`,
    getFraudRiskData(),
  ]);

  const kpi = (rows: KpiRow[]) => ({
    value: rows[0]?.current == null ? null : Number(rows[0].current),
    previous: rows[0]?.previous == null ? null : Number(rows[0].previous),
  });

  return {
    successRate: kpi(success),
    velocityPerDay: kpi(velocity),
    daysToGoal: kpi(toGoal),
    highRiskCount: risk.rows.filter((row) => row.score >= RISK_HIGH).length,
    curve: curve.map((point) => ({
      day: Number(point.day) + 1,
      cohort: point.cohort == null ? null : Number(point.cohort),
      average: point.average == null ? null : Number(point.average),
    })),
    cohortLabel: w.label,
  };
}

export const getCampaignOverviewData = unstable_cache(
  loadOverview,
  ["campaign-analytics-overview"],
  { revalidate: 300, tags: [CAMPAIGN_ANALYTICS_TAG] },
);
