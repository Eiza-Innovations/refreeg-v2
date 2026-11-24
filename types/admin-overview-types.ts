import type {
  Metric,
  Series,
  Tone,
  WorkItem,
} from "@/components/admin/workspace/types";
import type {
  giftSeries,
  giftTotals,
} from "@/lib/admin-analytics/workspace-data";

export type QueueStat = { count: number; oldest: Date | null };

export type WaitingRow = {
  type: "Campaign" | "KYC" | "Receipt" | "Petition" | "Report";
  /** Route param for the item's review page (user id for KYC, else the item id). */
  ref: string;
  title: string;
  detail: string | null;
  owner: string | null;
  created_at: Date;
  due_at: Date | null;
};

export type AdminOverviewData = {
  role: "admin" | "manager";
  generatedAt: Date;
  label: string;
  queues: {
    campaigns: QueueStat;
    kyc: QueueStat;
    receipts: QueueStat;
    petitions: QueueStat;
    reports: QueueStat;
  };
  reportsOverdue: number;
  waiting: WaitingRow[];
  campaigns: { active: number; inactive: number; paused: number };
  /** Admins only: managers never receive money figures. */
  money: {
    totals: Awaited<ReturnType<typeof giftTotals>>;
    series: Awaited<ReturnType<typeof giftSeries>>;
    labels: string[];
  } | null;
};

export type OverviewRole = "admin" | "manager";
export type OverviewQueue = {
  label: string;
  href: string;
  count: number;
  note: string;
  tone: Tone;
};
export type OverviewItem = Omit<WorkItem, "href"> & {
  href: string;
  type: string;
  owner: string;
  waiting: string;
  tone: Tone;
};
export type OverviewData = {
  role: OverviewRole;
  generatedAt: string;
  label: string;
  metrics: Metric[];
  donations: Series | null;
  donationsTotal: string;
  queues: OverviewQueue[];
  waiting: OverviewItem[];
  totalWaiting: number;
};
