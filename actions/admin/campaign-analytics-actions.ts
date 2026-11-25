"use server";

import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { revalidateTag, unstable_cache } from "next/cache";
import { getFraudRiskData } from "@/actions/admin/campaign-risk-actions";
import { prisma } from "@/lib/prisma";
import {
  readReport,
  requireReviewer,
  UNAUTHORIZED,
} from "@/lib/admin/report-access";
import { worstSteps, type SegmentRow } from "@/lib/campaign-analytics/funnel";
import { DAY_MS, reportingWindow } from "@/lib/campaign-analytics/period";
import {
  AUDIT_CLEARED,
  AUDIT_FROZEN,
  AUDIT_TAKEN_DOWN,
  RISK_HIGH,
} from "@/lib/campaign-analytics/risk-levels";
import {
  CAMPAIGN_ANALYTICS_TAG,
  giftsSql,
  launchedAtSql,
  ownerName,
  ownerSelect,
} from "@/lib/campaign-analytics/shared";
import {
  BIG_GIFT_AMOUNT,
  funnelStepOptions,
  takedownReasonOptions,
} from "@/lib/options/campaign-analytics.options";
import {
  campaignRiskActionSchema,
  takedownCampaignSchema,
  type CampaignRiskActionInput,
  type TakedownCampaignInput,
} from "@/lib/schemas/campaign-analytics.schema";
import { sendCampaignRemovedDonorEmail } from "@/services/mail";
import type {
  AnalyticsPeriod,
  CampaignOverview,
  DropOffReport,
  VelocityForecast,
  VelocityRow,
} from "@/types/campaign-analytics-types";

const CURVE_DAYS = 30;
const SPARK_DAYS = 14;
const ENDED_LOOKBACK_DAYS = 90;
const funnelSteps = funnelStepOptions.map((option) => option.value);

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

const getCampaignOverviewData = unstable_cache(
  loadOverview,
  ["campaign-analytics-overview"],
  { revalidate: 300, tags: [CAMPAIGN_ANALYTICS_TAG] },
);

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

const getVelocityData = unstable_cache(
  loadVelocity,
  ["campaign-analytics-velocity"],
  { revalidate: 300, tags: [CAMPAIGN_ANALYTICS_TAG] },
);

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
    steps: funnelSteps.map((step) => ({
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

const getDropOffData = unstable_cache(
  loadDropOff,
  ["campaign-analytics-drop-off"],
  { revalidate: 300, tags: [CAMPAIGN_ANALYTICS_TAG] },
);

export async function getCampaignOverview(period: AnalyticsPeriod) {
  return readReport(period, () => getCampaignOverviewData(period));
}

export async function getFundingVelocity(period: AnalyticsPeriod) {
  return readReport(period, () => getVelocityData(period));
}

export async function getCampaignDropOff(period: AnalyticsPeriod) {
  return readReport(period, () => getDropOffData(period));
}

export async function getFraudRisk() {
  return readReport(null, () => getFraudRiskData());
}

export async function takeDownCampaign(input: TakedownCampaignInput) {
  const actorId = await requireReviewer();
  if (!actorId) return UNAUTHORIZED;
  const parsed = takedownCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      data: null,
    };
  }
  const form = parsed.data;

  const cause = await prisma.cause.findUnique({
    where: { id: form.causeId },
    select: { title: true, status: true, userId: true, raised: true },
  });
  if (!cause)
    return { success: false, error: "Campaign not found", data: null };
  if (cause.status === "removed") {
    return {
      success: false,
      error: "This campaign is already taken down",
      data: null,
    };
  }

  const donors = await prisma.donation.findMany({
    where: { causeId: form.causeId, status: "completed" },
    select: { email: true },
    distinct: ["email"],
  });
  const now = new Date();

  await prisma.$transaction([
    prisma.cause.update({
      where: { id: form.causeId },
      data: {
        status: "removed",
        compliance_paused: true,
        compliance_paused_at: now,
      },
    }),
    ...(form.suspendCreator
      ? [
          prisma.user.update({
            where: { id: cause.userId },
            data: { isBlocked: true },
          }),
        ]
      : []),
    prisma.admin_audit_entries.create({
      data: {
        id: randomUUID(),
        actor_id: actorId,
        action: AUDIT_TAKEN_DOWN,
        kind: "cause",
        target_id: form.causeId,
        metadata: {
          reason: form.reason,
          note: form.note,
          funds: form.funds === "refund" ? "refund_pending" : "held",
          raised: Number(cause.raised ?? 0),
          donors: donors.length,
          suspendCreator: form.suspendCreator,
          notifyDonors: form.notifyDonors,
        },
      },
    }),
  ]);

  if (form.notifyDonors) {
    const reasonLabel =
      takedownReasonOptions.find((option) => option.value === form.reason)
        ?.label ?? "it broke our rules";
    void sendCampaignRemovedDonorEmail({
      bcc: donors.map((donor) => donor.email).filter(Boolean),
      causeTitle: cause.title,
      reasonLabel,
      refundLine:
        form.funds === "refund"
          ? "Your gift will be refunded to how you paid."
          : "Gifts are being held while the case is investigated.",
    });
  }

  revalidateTag(CAMPAIGN_ANALYTICS_TAG);
  return {
    success: true,
    error: null,
    data: { title: cause.title, donors: donors.length, funds: form.funds },
  };
}

export async function setCampaignRiskState(input: CampaignRiskActionInput) {
  const actorId = await requireReviewer();
  if (!actorId) return UNAUTHORIZED;
  const parsed = campaignRiskActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      data: null,
    };
  }
  const { causeId, action } = parsed.data;
  const freeze = action === "freeze";
  // A missed proof deadline keeps the campaign paused even after risk is cleared.
  const proofOverdue = await prisma.campaign_proof_requirements.count({
    where: {
      cause_id: causeId,
      status: "pending",
      deadline: { lt: new Date() },
    },
  });

  await prisma.$transaction([
    prisma.cause.update({
      where: { id: causeId },
      data: {
        compliance_paused: freeze || proofOverdue > 0,
        compliance_paused_at: freeze
          ? new Date()
          : proofOverdue > 0
            ? undefined
            : null,
      },
    }),
    prisma.admin_audit_entries.create({
      data: {
        id: randomUUID(),
        actor_id: actorId,
        action: freeze ? AUDIT_FROZEN : AUDIT_CLEARED,
        kind: "cause",
        target_id: causeId,
      },
    }),
  ]);

  revalidateTag(CAMPAIGN_ANALYTICS_TAG);
  return { success: true, error: null, data: { action } };
}
