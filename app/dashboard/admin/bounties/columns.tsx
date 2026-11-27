"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { ArrowRight } from "lucide-react";
import { BountyStatusBadge } from "@/components/bounties/BountyStatusBadge";
import type { DataTableFeatures } from "@/components/ui/data-table-features";
import type { Bounty } from "@/types/bounty-types";

const columnHelper = createColumnHelper<DataTableFeatures, Bounty>();

export const bountyQueueColumns = columnHelper.columns([
  columnHelper.display({
    id: "bounty",
    header: "Bounty",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/admin/bounties/${row.original.id}`}
        className="flex flex-col"
      >
        <span className="font-medium text-ink">{row.original.title}</span>
        <span className="mt-0.5 text-xs text-ink/50">
          {row.original.campaign}
        </span>
      </Link>
    ),
  }),
  columnHelper.accessor("owner", {
    header: "Owner",
    cell: (info) => (
      <span className="text-sm text-ink/70">{info.getValue()}</span>
    ),
  }),
  columnHelper.display({
    id: "reward",
    header: "Reward",
    cell: ({ row }) => (
      <span className="text-sm font-medium text-ink">
        ₦{row.original.reward.toLocaleString()} × {row.original.availableSpots}
      </span>
    ),
  }),
  columnHelper.accessor("submittedAt", {
    header: "Submitted",
    cell: (info) => (
      <span className="text-sm text-ink/70">
        {new Date(info.getValue()).toLocaleDateString("en-NG")}
      </span>
    ),
  }),
  columnHelper.display({
    id: "status",
    header: "Status",
    cell: ({ row }) => <BountyStatusBadge status={row.original.status} />,
  }),
  columnHelper.display({
    id: "review",
    header: "",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/admin/bounties/${row.original.id}`}
        aria-label={`Review ${row.original.title}`}
        className="inline-flex items-center text-sm font-semibold text-ink"
      >
        Review
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Link>
    ),
  }),
]);
