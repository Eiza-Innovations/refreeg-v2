"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { Strong } from "@/components/marketing/Typography";
import type { DataTableFeatures } from "@/components/ui/data-table-features";
import { Chip } from "@/components/admin/workspace/chip";
import { Person } from "@/components/admin/workspace/person";
import type { OverviewItem } from "@/components/admin/workspace/types";

const columnHelper = createColumnHelper<DataTableFeatures, OverviewItem>();

export const waitingColumns = columnHelper.columns([
  columnHelper.display({
    id: "item",
    header: "Item",
    cell: ({ row }) => (
      <Link href={row.original.href} className="block hover:opacity-80">
        <Person
          name={row.original.name}
          detail={row.original.detail}
          initials={row.original.initials}
          tone={row.original.tone}
        />
      </Link>
    ),
  }),
  columnHelper.accessor("type", { header: "Type" }),
  columnHelper.accessor("owner", { header: "Owner" }),
  columnHelper.display({
    id: "waiting",
    header: "Waiting",
    cell: ({ row }) => (
      <Strong className="tabular-nums">{row.original.waiting}</Strong>
    ),
  }),
  columnHelper.display({
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <Chip tone={row.original.tone} dot>
        {row.original.status}
      </Chip>
    ),
  }),
]);
