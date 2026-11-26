"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { CampaignCell } from "@/components/admin/campaign-analytics/CampaignCell";
import { ForecastBadge } from "@/components/admin/campaign-analytics/ForecastBadge";
import { Sparkline } from "@/components/admin/campaign-analytics/Sparkline";
import type { DataTableFeatures } from "@/components/ui/data-table-features";
import { Small, Span } from "@/components/marketing/Typography";
import {
  formatNairaCompact,
  percentChange,
  signedPercent,
} from "@/lib/campaign-analytics/format";
import { cn } from "@/lib/utils";
import type { VelocityRow } from "@/types/campaign-analytics-types";

const columnHelper = createColumnHelper<DataTableFeatures, VelocityRow>();

export const velocityColumns = (compare: boolean) =>
  columnHelper.columns([
    columnHelper.display({
      id: "campaign",
      header: "Campaign",
      cell: ({ row }) => (
        <Link
          href={`/causes/${row.original.id}`}
          className="block max-w-64"
          target="_blank"
        >
          <CampaignCell title={row.original.title} owner={row.original.owner} />
        </Link>
      ),
    }),
    columnHelper.display({
      id: "raised",
      header: "Raised",
      cell: ({ row }) => (
        <Span className="text-sm text-ink">
          {formatNairaCompact(row.original.raised)}
          <Span className="text-ink/50">
            {" "}
            / {formatNairaCompact(row.original.goal)}
          </Span>
        </Span>
      ),
    }),
    columnHelper.accessor("perDay", {
      header: "Velocity",
      cell: ({ row }) => {
        const change = percentChange(
          row.original.perDay,
          row.original.previousPerDay,
        );
        return (
          <Span className="text-sm font-semibold text-ink">
            {formatNairaCompact(row.original.perDay)}/day
            {compare && change != null && (
              <Small
                className={cn(
                  "block text-[11px] font-medium",
                  change >= 0 ? "text-forest" : "text-rust",
                )}
              >
                {signedPercent(change)} vs last period
              </Small>
            )}
          </Span>
        );
      },
    }),
    columnHelper.display({
      id: "trend",
      header: "Last 14 days",
      cell: ({ row }) => <Sparkline values={row.original.daily} />,
    }),
    columnHelper.accessor("daysLeft", {
      header: "Days left",
      cell: (info) => (
        <Span className="text-sm text-ink">{info.getValue() ?? "—"}</Span>
      ),
    }),
    columnHelper.display({
      id: "forecast",
      header: "Forecast",
      cell: ({ row }) => <ForecastBadge row={row.original} />,
    }),
  ]);
