import { AnalyticsWorkspace } from "@/components/admin/analytics-workspace";
import { getWorkspaceData } from "@/actions/admin/admin-analytics-actions";
import type { Period } from "@/components/admin/workspace/types";

export const metadata = {
  title: "Admin analytics",
  robots: { index: false, follow: false },
};

const PERIODS: Period[] = ["day", "month", "year"];

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: requested } = await searchParams;
  const period = PERIODS.includes(requested as Period)
    ? (requested as Period)
    : "month";
  const data = await getWorkspaceData(period);

  return <AnalyticsWorkspace data={data} />;
}
