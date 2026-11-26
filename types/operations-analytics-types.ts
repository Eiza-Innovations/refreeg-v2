export type QueueKey =
  "campaigns" | "kyc" | "receipts" | "petitions" | "reports";

export type Series = {
  labels: string[];
  values: number[];
  currentIndex: number;
};

export type QueueStats = {
  key: QueueKey;
  inflow: number;
  previousInflow: number;
  decided: number;
  previousDecided: number;
  backlog: number;
  overSla: number;
  oldestWaitingAt: string | null;
  medianHours: number | null;
  previousMedianHours: number | null;
};

export type FactFormat = "count" | "naira" | "percent";

export type ReviewReport = {
  stats: QueueStats;
  approved: number;
  rejected: number;
  previousApproved: number;
  previousRejected: number;
  series: Series;
  seriesKind: "decisions" | "signatures";
  breakdowns: { title: string; rows: { label: string; value: number }[] }[];
  facts: { label: string; value: number | null; format: FactFormat }[];
};

export type OverviewItemStatus =
  "over-sla" | "in-review" | "face-match" | "amount-mismatch" | "reported";

export type OverviewItem = {
  id: string;
  queue: QueueKey;
  title: string;
  detail: string;
  waitingHours: number;
  status: OverviewItemStatus;
  faceMatch: number | null;
};

export type AdminOverview = {
  raised: number;
  previousRaised: number;
  activeCampaigns: number;
  newCampaigns: number;
  donations: { values: number[]; labels: string[] };
  queues: Pick<QueueStats, "key" | "backlog" | "overSla" | "oldestWaitingAt">[];
  items: OverviewItem[];
};
