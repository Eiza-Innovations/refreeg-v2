export interface AnalyticsData {
  totalDonations: {
    current: string;
    previous: string;
    trend: number;
  };
  totalUsers: {
    current: number;
    newInPeriod: number;
    trend: number;
  };
  activeCauses: {
    active: number;
    total: number;
  };
  pendingApprovals: {
    current: number;
  };
}

export interface DonationTrend {
  period: string;
  regular: number;
  crypto: number;
  total: number;
  count: number;
}

export interface UserGrowth {
  period: string;
  users: number;
  active: number;
}

export interface CauseCategory {
  category: string;
  total: number;
  approved: number;
  pending: number;
  completed: number;
}

export interface KycAnalytics {
  total: number;
  approvalRate: number;
  pending: number;
  /** Median hours from submission to decision; null until decisions exist. */
  avgProcessingTimeHours: number | null;
}

export interface PaymentAnalytics {
  total: number;
  failureRate: number;
  failedAmount: number;
}

export interface CauseLifecycle {
  funnel: {
    created: number;
    pending: number;
    approved: number;
  };
  avgApprovalTimeHours: number | null;
}

export interface Alert {
  id: string;
  type: "warning" | "critical";
  message: string;
  metric: string;
  value: string;
  threshold: string;
}
