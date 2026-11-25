"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { CampaignCell } from "@/components/admin/campaign-analytics/CampaignCell";
import { RiskScoreBar } from "@/components/admin/campaign-analytics/RiskScoreBar";
import { RiskSuggestionBadge } from "@/components/admin/campaign-analytics/RiskSuggestionBadge";
import type { DataTableFeatures } from "@/components/ui/data-table-features";
import { RISK_HIGH } from "@/lib/campaign-analytics/risk-levels";
import type { RiskRow } from "@/types/campaign-analytics-types";

const columnHelper = createColumnHelper<DataTableFeatures, RiskRow>();

export const fraudRiskColumns = (onOpen: (row: RiskRow) => void) =>
  columnHelper.columns([
    columnHelper.display({
      id: "campaign",
      header: "Campaign",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onOpen(row.original)}
          aria-label={`Open risk details for ${row.original.title}`}
          className="max-w-64 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          <CampaignCell
            title={row.original.title}
            owner={row.original.owner}
            tone={row.original.score >= RISK_HIGH ? "risk" : "neutral"}
          />
        </button>
      ),
    }),
    columnHelper.accessor("score", {
      header: "Risk score",
      cell: (info) => <RiskScoreBar score={info.getValue()} />,
    }),
    columnHelper.display({
      id: "signals",
      header: "Signals",
      cell: ({ row }) => (
        <span className="flex flex-wrap gap-1.5">
          {row.original.signals.slice(0, 3).map((signal) => (
            <Badge
              key={signal.key}
              variant="held"
              className="gap-1.5 font-medium"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-ink/40" />
              {signal.label}
            </Badge>
          ))}
        </span>
      ),
    }),
    columnHelper.display({
      id: "suggested",
      header: "Suggested",
      cell: ({ row }) => (
        <RiskSuggestionBadge suggestion={row.original.suggestion} />
      ),
    }),
  ]);
