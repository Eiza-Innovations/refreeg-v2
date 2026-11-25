"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { type DataTableFeatures } from "@/components/ui/data-table-features";
import { formatNairaFull } from "@/hooks/use-partner-credits";
import { cn } from "@/lib/utils";
import type {
  PartnerCreditTransactionItem,
  PartnerCreditTransactionType,
} from "@/types/partner-credit-types";

const columnHelper = createColumnHelper<
  DataTableFeatures,
  PartnerCreditTransactionItem
>();

const ACTIVITY_LABELS: Record<PartnerCreditTransactionType, string> = {
  initial_grant: "Initial grant approved",
  top_up: "Top up approved",
  allocation: "Allocated",
  employee_match: "Employee match",
  adjustment: "Adjustment",
};

export const partnerActivityColumns = columnHelper.columns([
  columnHelper.accessor("createdAt", {
    header: "Date",
    cell: (info) => (
      <span className="text-sm text-ink/70">
        {new Date(info.getValue()).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </span>
    ),
  }),
  columnHelper.display({
    id: "activity",
    header: "Activity",
    cell: ({ row }) => (
      <span className="font-medium text-ink">
        {ACTIVITY_LABELS[row.original.type] ?? row.original.type}
      </span>
    ),
  }),
  columnHelper.display({
    id: "campaign",
    header: "Campaign",
    cell: ({ row }) => (
      <span className="text-sm text-ink/75">
        {row.original.causeTitle || row.original.note || "—"}
      </span>
    ),
  }),
  columnHelper.accessor("amount", {
    header: "Credits",
    cell: (info) => {
      const amount = info.getValue();
      const isCredit = amount > 0;
      const prefix = isCredit ? "+ " : "− ";
      return (
        <span
          className={cn(
            "font-semibold tabular-nums",
            isCredit ? "text-forest" : "text-ink",
          )}
        >
          {prefix}
          {formatNairaFull(Math.abs(amount))}
        </span>
      );
    },
  }),
]);
