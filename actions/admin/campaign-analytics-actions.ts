"use server";

import { unstable_cache } from "next/cache";
import { getFraudRiskData } from "@/actions/admin/campaign-risk-actions";
import { requireAdminOrManager } from "@/lib/auth/admin-auth";
import { prisma } from "@/lib/prisma";
import { worstSteps } from "@/lib/campaign-analytics/funnel";
import { DAY_MS, reportingWindow } from "@/lib/campaign-analytics/period";
import {
  BIG_GIFT_AMOUNT,
  RISK_HIGH,
} from "@/lib/campaign-analytics/risk-levels";
import {
  CAMPAIGN_ANALYTICS_TAG,
  ownerName,
  ownerSelect,
} from "@/lib/campaign-analytics/shared";
import { funnelStepOptions } from "@/lib/options/campaign-analytics.options";
import { analyticsPeriodSchema } from "@/lib/schemas/campaign-analytics.schema";
import type {
  AnalyticsPeriod,
  CampaignOverview,
  DropOffReport,
  FunnelStep,
  SegmentRow,
  VelocityForecast,
  VelocityRow,
} from "@/types/campaign-analytics-types";

const CURVE_DAYS = 30;
const SPARK_DAYS = 14;
const ENDED_LOOKBACK_DAYS = 90;
const funnelSteps = funnelStepOptions.map((option) => option.value);

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

async function completedGifts(from: Date, to: Date) {
  const [fiat, crypto] = await Promise.all([
    prisma.donation.findMany({
      where: { status: "completed", createdAt: { gte: from, lt: to } },
      select: { causeId: true, amount: true, createdAt: true },
    }),
    prisma.crypto_donations.findMany({
      where: { status: "completed", created_at: { gte: from, lt: to } },
      select: { cause_id: true, amount_in_naira: true, created_at: true },
    }),
  ]);
  const rows: { causeId: string; amount: number; createdAt: Date }[] = [];
  for (const d of fiat) {
    if (d.createdAt) {
      rows.push({
        causeId: d.causeId,
        amount: Number(d.amount),
        createdAt: d.createdAt,
      });
    }
  }
  for (const d of crypto) {
    if (d.created_at) {
      rows.push({
        causeId: d.cause_id,
        amount: Number(d.amount_in_naira),
        createdAt: d.created_at,
      });
    }
  }
  return rows;
}

async function loadOverview(
  period: AnalyticsPeriod,
): Promise<CampaignOverview> {
  const w = reportingWindow(period);
  const now = Date.now();
  const yearBefore = new Date(w.from.getTime() - 365 * DAY_MS);
  const earliest = new Date(
    Math.min(yearBefore.getTime(), w.previousFrom.getTime()),
  );

  const [causes, gifts, risk] = await Promise.all([
    prisma.cause.findMany({
      where: { status: "approved", goal: { gt: 0 } },
      select: {
        id: true,
        goal: true,
        raised: true,
        createdAt: true,
        start_date: true,
        end_date: true,
      },
    }),
    completedGifts(earliest, w.to),
    getFraudRiskData(),
  ]);

  // Success rate: ended in current vs previous window.
  let curEnded = 0;
  let curHit = 0;
  let prevEnded = 0;
  let prevHit = 0;
  for (const c of causes) {
    if (!c.end_date) continue;
    const hit = Number(c.raised ?? 0) >= Number(c.goal);
    if (c.end_date >= w.from && c.end_date < w.to) {
      curEnded++;
      if (hit) curHit++;
    } else if (c.end_date >= w.previousFrom && c.end_date < w.previousTo) {
      prevEnded++;
      if (hit) prevHit++;
    }
  }

  // Velocity per day across causes with gifts in each window.
  const curByCause = new Map<string, number>();
  const prevByCause = new Map<string, number>();
  const giftsByCause = new Map<string, typeof gifts>();
  for (const g of gifts) {
    if (g.createdAt >= w.from && g.createdAt < w.to) {
      curByCause.set(g.causeId, (curByCause.get(g.causeId) ?? 0) + g.amount);
    } else if (g.createdAt >= w.previousFrom && g.createdAt < w.previousTo) {
      prevByCause.set(g.causeId, (prevByCause.get(g.causeId) ?? 0) + g.amount);
    }
    const list = giftsByCause.get(g.causeId) ?? [];
    list.push(g);
    giftsByCause.set(g.causeId, list);
  }
  const velCur = median([...curByCause.values()].filter((v) => v > 0));
  const velPrev = median([...prevByCause.values()].filter((v) => v > 0));

  // Days to goal for causes launched in the last year + 30-day curve.
  const daysCur: number[] = [];
  const daysPrev: number[] = [];
  const curveBuckets = Array.from({ length: CURVE_DAYS }, () => ({
    cohortSum: 0,
    cohortN: 0,
    avgSum: 0,
    avgN: 0,
  }));

  for (const c of causes) {
    const launchedAt = c.start_date ?? c.createdAt;
    if (!launchedAt || launchedAt < yearBefore || launchedAt >= w.to) continue;
    const goal = Number(c.goal);
    const cGifts = (giftsByCause.get(c.id) ?? []).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    let cum = 0;
    const daily = new Map<number, number>();
    let reachedAt: Date | null = null;
    for (const g of cGifts) {
      cum += g.amount;
      if (!reachedAt && cum >= goal) reachedAt = g.createdAt;
      const day = Math.max(
        0,
        Math.floor((g.createdAt.getTime() - launchedAt.getTime()) / DAY_MS),
      );
      if (day < CURVE_DAYS) daily.set(day, (daily.get(day) ?? 0) + g.amount);
    }

    if (reachedAt) {
      const days = (reachedAt.getTime() - launchedAt.getTime()) / DAY_MS;
      if (reachedAt >= w.from && reachedAt < w.to) daysCur.push(days);
      else if (reachedAt >= w.previousFrom && reachedAt < w.previousTo) {
        daysPrev.push(days);
      }
    }

    const inCohort = launchedAt >= w.from;
    let running = 0;
    for (let day = 0; day < CURVE_DAYS; day++) {
      if (launchedAt.getTime() + day * DAY_MS > now) break;
      running += daily.get(day) ?? 0;
      const pct = 100 * Math.min(running / goal, 1.5);
      const bucket = curveBuckets[day];
      if (inCohort) {
        bucket.cohortSum += pct;
        bucket.cohortN++;
      } else {
        bucket.avgSum += pct;
        bucket.avgN++;
      }
    }
  }

  return {
    successRate: {
      value: curEnded > 0 ? (100 * curHit) / curEnded : null,
      previous: prevEnded > 0 ? (100 * prevHit) / prevEnded : null,
    },
    velocityPerDay: {
      value: velCur == null ? null : velCur / w.days,
      previous: velPrev == null ? null : velPrev / w.days,
    },
    daysToGoal: {
      value: median(daysCur),
      previous: median(daysPrev),
    },
    highRiskCount: risk.rows.filter((row) => row.score >= RISK_HIGH).length,
    curve: curveBuckets
      .map((b, day) => ({
        day: day + 1,
        cohort: b.cohortN > 0 ? b.cohortSum / b.cohortN : null,
        average: b.avgN > 0 ? b.avgSum / b.avgN : null,
      }))
      .filter((p) => p.cohort !== null || p.average !== null),
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
  const earliest = new Date(
    Math.min(w.previousFrom.getTime(), sparkFrom.getTime()),
  );

  const [causes, gifts] = await Promise.all([
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
    completedGifts(earliest, w.to),
  ]);

  const sumsById = new Map<string, { current: number; previous: number }>();
  const dailyById = new Map<string, number[]>();
  for (const g of gifts) {
    const sum = sumsById.get(g.causeId) ?? { current: 0, previous: 0 };
    if (g.createdAt >= w.from && g.createdAt < w.to) sum.current += g.amount;
    else if (g.createdAt >= w.previousFrom && g.createdAt < w.previousTo) {
      sum.previous += g.amount;
    }
    sumsById.set(g.causeId, sum);

    if (g.createdAt >= sparkFrom) {
      const series = dailyById.get(g.causeId) ?? Array(SPARK_DAYS).fill(0);
      const ago = Math.floor((now - g.createdAt.getTime()) / DAY_MS);
      const index = SPARK_DAYS - 1 - ago;
      if (index >= 0 && index < SPARK_DAYS) series[index] += g.amount;
      dailyById.set(g.causeId, series);
    }
  }

  return causes
    .map((cause) => {
      const goal = Number(cause.goal);
      const raised = Number(cause.raised ?? 0);
      const sum = sumsById.get(cause.id);
      const perDay = (sum?.current ?? 0) / w.days;
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
        previousPerDay: (sum?.previous ?? 0) / w.days,
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

  const [currentSteps, prevSteps, events] = await Promise.all([
    prisma.campaign_funnel_events.groupBy({
      by: ["step"],
      where: { created_at: { gte: w.from, lt: w.to } },
      _count: { _all: true },
    }),
    prisma.campaign_funnel_events.groupBy({
      by: ["step"],
      where: { created_at: { gte: w.previousFrom, lt: w.previousTo } },
      _count: { _all: true },
    }),
    prisma.campaign_funnel_events.findMany({
      where: { created_at: { gte: w.from, lt: w.to } },
      select: {
        cause_id: true,
        session_id: true,
        step: true,
        reason: true,
        device: true,
        amount: true,
        first_time: true,
      },
    }),
  ]);

  const causeIds = Array.from(new Set(events.map((e) => e.cause_id)));
  const causesWithImage = new Set(
    causeIds.length > 0
      ? (
          await prisma.cause.findMany({
            where: { id: { in: causeIds }, image: { not: null } },
            select: { id: true },
          })
        ).map((c) => c.id)
      : [],
  );

  const curMap = new Map(currentSteps.map((r) => [r.step, r._count._all]));
  const prevMap = new Map(prevSteps.map((r) => [r.step, r._count._all]));

  const paidSessions = new Set(
    events
      .filter((e) => e.step === "paid")
      .map((e) => `${e.session_id}:${e.cause_id}`),
  );
  const reasonCounts = new Map<string, number>();
  const bySessionCause = new Map<
    string,
    {
      device: string | null;
      big_gift: boolean;
      first_time: boolean;
      no_photo: boolean;
      steps: Set<FunnelStep>;
    }
  >();

  for (const e of events) {
    const key = `${e.session_id}:${e.cause_id}`;
    if (e.step === "failed" && e.reason && !paidSessions.has(key)) {
      reasonCounts.set(e.reason, (reasonCounts.get(e.reason) ?? 0) + 1);
    }
    const entry = bySessionCause.get(key) ?? {
      device: e.device,
      big_gift: false,
      first_time: false,
      no_photo: !causesWithImage.has(e.cause_id),
      steps: new Set<FunnelStep>(),
    };
    if (e.device && !entry.device) entry.device = e.device;
    if (e.amount != null && Number(e.amount) > BIG_GIFT_AMOUNT) {
      entry.big_gift = true;
    }
    if (e.first_time) entry.first_time = true;
    if (funnelSteps.includes(e.step as FunnelStep)) {
      entry.steps.add(e.step as FunnelStep);
    }
    bySessionCause.set(key, entry);
  }

  const segmentRows: SegmentRow[] = [...bySessionCause.values()].map((s) => ({
    device: s.device,
    big_gift: s.big_gift,
    first_time: s.first_time,
    no_photo: s.no_photo,
    view: s.steps.has("view") ? 1 : 0,
    give: s.steps.has("give") ? 1 : 0,
    amount: s.steps.has("amount") ? 1 : 0,
    payment: s.steps.has("payment") ? 1 : 0,
    paid: s.steps.has("paid") ? 1 : 0,
  }));

  return {
    steps: funnelSteps.map((step) => ({
      step,
      sessions: curMap.get(step) ?? 0,
      previous: prevMap.get(step) ?? 0,
    })),
    reasons: [...reasonCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([reason, sessions]) => ({ reason, sessions })),
    segments: worstSteps(segmentRows),
  };
}

const getDropOffData = unstable_cache(
  loadDropOff,
  ["campaign-analytics-drop-off"],
  { revalidate: 300, tags: [CAMPAIGN_ANALYTICS_TAG] },
);

async function runReport<T>(
  period: AnalyticsPeriod | null,
  load: () => Promise<T>,
) {
  try {
    await requireAdminOrManager();
    if (period !== null && !analyticsPeriodSchema.safeParse(period).success) {
      return { success: false, error: "Unknown period", data: null };
    }
    return { success: true, error: null, data: await load() };
  } catch (error) {
    console.error("Campaign analytics report failed:", error);
    return {
      success: false,
      error: "Couldn't load this report. Try again.",
      data: null,
    };
  }
}

export async function getCampaignOverview(period: AnalyticsPeriod) {
  return runReport(period, () => getCampaignOverviewData(period));
}

export async function getFundingVelocity(period: AnalyticsPeriod) {
  return runReport(period, () => getVelocityData(period));
}

export async function getCampaignDropOff(period: AnalyticsPeriod) {
  return runReport(period, () => getDropOffData(period));
}

export async function getFraudRisk() {
  return runReport(null, () => getFraudRiskData());
}
