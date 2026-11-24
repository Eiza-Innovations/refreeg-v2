"use client";

import { AnalyticsDay } from "./analytics-day";
import { AnalyticsMonth } from "./analytics-month";
import { AnalyticsYear } from "./analytics-year";
import type { AnalyticsViewProps } from "./types";

export function AnalyticsContent(props: AnalyticsViewProps) {
  const { period } = props.data;
  if (period === "day") return <AnalyticsDay {...props} />;
  if (period === "year") return <AnalyticsYear {...props} />;
  return <AnalyticsMonth {...props} />;
}
