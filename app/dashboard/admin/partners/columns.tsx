"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type DataTableFeatures } from "@/components/ui/data-table-features";
import { Progress } from "@/components/ui/progress";
import { formatNairaFull } from "@/hooks/use-partner-credits";
import type {
  PartnerAccountSummary,
  PartnerStatus,
} from "@/types/partner-credit-types";

const columnHelper = createColumnHelper<
  DataTableFeatures,
  PartnerAccountSummary
>();

const STATUS_BADGE: Record<
  PartnerStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  pending_approval: { label: "Pending approval", variant: "pending" },
  invited: { label: "Invited", variant: "blue" },
  active: { label: "Active", variant: "forest" },
  exhausted: { label: "Exhausted", variant: "held" },
  suspended: { label: "Suspended", variant: "critical" },
  rejected: { label: "Rejected", variant: "critical" },
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PR";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

export const partnerColumns = (
  onManage: (partner: PartnerAccountSummary) => void,
) =>
  columnHelper.columns([
    columnHelper.display({
      id: "partner",
      header: "Partner",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-bone text-xs font-semibold text-ink">
                {initialsFor(p.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{p.name}</p>
              <p className="truncate text-xs text-ink/55">{p.contactEmail}</p>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("creditsIssued", {
      header: "Credits issued",
      cell: (info) => (
        <span className="font-medium text-ink">
          {formatNairaFull(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("creditsUsed", {
      header: "Used",
      cell: (info) => (
        <span className="text-ink/80">{formatNairaFull(info.getValue())}</span>
      ),
    }),
    columnHelper.display({
      id: "utilisation",
      header: "Utilisation",
      cell: ({ row }) => {
        const pct = row.original.utilizationPct;
        return (
          <div className="flex min-w-0 sm:min-w-[120px] items-center gap-2.5">
            <Progress
              value={pct}
              indicatorVariant="forest"
              className="h-2 flex-1 bg-cream-muted"
              aria-label={`${pct}% used`}
            />
            <span className="w-9 text-right text-xs font-medium text-ink/70">
              {pct}%
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const meta = STATUS_BADGE[row.original.status] ?? {
          label: row.original.status,
          variant: "secondary" as const,
        };
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            {row.original.isExpired && <Badge variant="pending">Expired</Badge>}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const canManage =
          row.original.status !== "pending_approval" &&
          row.original.status !== "rejected";
        if (!canManage) return null;
        return (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="surface"
              size="sm"
              onClick={() => onManage(row.original)}
            >
              Manage
            </Button>
          </div>
        );
      },
    }),
  ]);
