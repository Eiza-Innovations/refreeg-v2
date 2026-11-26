"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Gauge, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsHeader } from "@/components/admin/campaign-analytics/AnalyticsHeader";
import {
  VelocityFilters,
  type VelocityFilterState,
} from "@/components/admin/campaign-analytics/VelocityFilters";
import {
  useAnalyticsPeriod,
  useFundingVelocity,
} from "@/hooks/use-campaign-analytics";
import { downloadCsv } from "@/lib/download-csv";
import { velocityColumns } from "./columns";

const PAGE_SIZE = 8;
const emptyFilters: VelocityFilterState = {
  search: "",
  category: "all",
  forecast: "all",
  state: "live",
};

export function FundingVelocityClient() {
  const { period, compare } = useAnalyticsPeriod();
  const velocity = useFundingVelocity(period);
  const [filters, setFilters] = useState(emptyFilters);
  const [pageIndex, setPageIndex] = useState(0);
  const columns = useMemo(() => velocityColumns(compare), [compare]);
  const rows = useMemo(() => velocity.data ?? [], [velocity.data]);

  const setFilter = (key: keyof VelocityFilterState, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPageIndex(0);
  };

  const categories = useMemo(
    () => [...new Set(rows.map((row) => row.category))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = filters.search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        row.state === filters.state &&
        (filters.category === "all" || row.category === filters.category) &&
        (filters.forecast === "all" || row.forecast === filters.forecast) &&
        (!needle || `${row.title} ${row.owner}`.toLowerCase().includes(needle)),
    );
  }, [rows, filters]);

  const handleExport = () =>
    downloadCsv(
      `funding-velocity-${period}`,
      [
        "Campaign",
        "Creator",
        "Category",
        "Raised",
        "Goal",
        "Naira per day",
        "Days left",
        "Forecast",
      ],
      filtered.map((row) => [
        row.title,
        row.owner,
        row.category,
        Math.round(row.raised),
        Math.round(row.goal),
        Math.round(row.perDay),
        row.daysLeft,
        row.forecast,
      ]),
    );

  const filtersActive =
    filters.search.trim() !== "" ||
    filters.category !== "all" ||
    filters.forecast !== "all";

  const emptyState = velocity.error
    ? {
        icon: <AlertTriangle className="h-7 w-7 text-rust" />,
        title: "Velocity is unavailable",
        description: velocity.error,
      }
    : filtersActive
      ? {
          icon: <Search className="h-7 w-7" />,
          title: "No matches for these filters",
          description: "Clear them to see every campaign in this state.",
          action: (
            <Button
              variant="ink"
              size="sm"
              onClick={() =>
                setFilters({ ...emptyFilters, state: filters.state })
              }
            >
              Clear filters
            </Button>
          ),
        }
      : {
          icon: <Gauge className="h-7 w-7" />,
          title: `No ${filters.state} campaigns`,
          description:
            "Approved campaigns show up here with how fast they're raising.",
        };

  return (
    <div className="space-y-6">
      <AnalyticsHeader
        crumb="Velocity"
        title="Funding velocity"
        description="Campaigns ranked by how fast they're raising in this period."
        onExport={filtered.length ? handleExport : undefined}
      />

      <VelocityFilters
        filters={filters}
        categories={categories}
        onChange={setFilter}
      />

      <Card variant="surface" className="overflow-hidden py-0">
        <CardContent className="p-0">
          {velocity.isLoading ? (
            <Skeleton className="m-4 h-64" />
          ) : filtered.length === 0 ? (
            <EmptyState variant="page" className="py-16" {...emptyState} />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              pageSize={PAGE_SIZE}
              pageIndex={pageIndex}
              onPageIndexChange={setPageIndex}
              pagination
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
