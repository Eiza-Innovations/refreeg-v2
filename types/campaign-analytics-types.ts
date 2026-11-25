export type AnalyticsPeriod = "day" | "month" | "year";

export type Kpi = { value: number | null; previous: number | null };

export type CampaignOverview = {
  successRate: Kpi;
  velocityPerDay: Kpi;
  daysToGoal: Kpi;
  highRiskCount: number;
  curve: { day: number; cohort: number | null; average: number | null }[];
  cohortLabel: string;
};

export type FunnelStep = "view" | "give" | "amount" | "payment" | "paid";

export type FunnelStepRow = {
  step: FunnelStep;
  sessions: number;
  previous: number;
};

export type LeaveReasonRow = { reason: string; sessions: number };

export type FunnelSegmentRow = {
  segment: string;
  step: FunnelStep;
  dropVsAverage: number;
};

export type DropOffReport = {
  steps: FunnelStepRow[];
  reasons: LeaveReasonRow[];
  segments: FunnelSegmentRow[];
};

export type VelocityForecast = "will-hit" | "short" | "stalled" | "open";

export type VelocityRow = {
  id: string;
  title: string;
  owner: string;
  category: string;
  state: "live" | "frozen" | "ended";
  raised: number;
  goal: number;
  perDay: number;
  previousPerDay: number;
  daily: number[];
  daysLeft: number | null;
  forecast: VelocityForecast;
  shortBy: number;
};

export type RiskSignal = {
  key: string;
  label: string;
  weight: number;
  detail: string;
};

export type RiskSuggestion = "take-down" | "freeze" | "review" | "watch";

export type RiskRow = {
  id: string;
  title: string;
  owner: string;
  score: number;
  suggestion: RiskSuggestion;
  signals: RiskSignal[];
  raised: number;
  donors: number;
  frozen: boolean;
  frozenAt: string | null;
};

export type FraudRiskReport = {
  rows: RiskRow[];
  scored: number;
  confirmedThisMonth: number;
};

export type SegmentCounts = Record<FunnelStep, number>;

export type SegmentRow = SegmentCounts & {
  device: string | null;
  big_gift: boolean | null;
  first_time: boolean | null;
  no_photo: boolean;
};

export type ReportingWindow = {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  days: number;
  label: string;
};
