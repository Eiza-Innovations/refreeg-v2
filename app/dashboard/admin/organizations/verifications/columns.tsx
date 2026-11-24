"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { getMediaUrl } from "@/lib/s3/media";
import { formatRelativeTime } from "@/lib/format-date";
import {
  features,
  type DataTableFeatures,
} from "@/components/ui/data-table-features";
import type { OrganizationVerificationRow } from "@/types/organization-types";

const columnHelper = createColumnHelper<
  DataTableFeatures,
  OrganizationVerificationRow
>();

export const verificationColumns = (
  onReview: (id: string, decision: "approve" | "reject") => void,
) =>
  columnHelper.columns([
    columnHelper.display({
      id: "organisation",
      header: "Organisation",
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className="font-medium text-ink">
            {row.original.organizationName}
          </span>
          <span className="text-xs text-ink/50">
            {[row.original.registrationNumber, row.original.country]
              .filter(Boolean)
              .join(" · ") || "No registration number"}
          </span>
        </span>
      ),
    }),
    columnHelper.accessor("adminEmail", {
      header: "Contact",
      cell: (info) => (
        <span className="text-sm text-ink/70">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("submittedAt", {
      header: "Submitted",
      cell: ({ row }) => (
        <span className="text-sm text-ink/70">
          {formatRelativeTime(row.original.submittedAt)}
        </span>
      ),
    }),
    columnHelper.display({
      id: "documents",
      header: "Documents",
      cell: ({ row }) => (
        <span className="flex flex-col gap-1 text-sm">
          <a
            className="font-medium text-blue-accent hover:underline"
            href={getMediaUrl(row.original.registrationDocKey)}
            target="_blank"
            rel="noreferrer"
          >
            Registration doc
          </a>
          <span className="text-xs text-ink/50">
            {row.original.directorIdKeys.length} director{" "}
            {row.original.directorIdKeys.length === 1 ? "ID" : "IDs"}:{" "}
            {row.original.directorIdKeys.map((key, index) => (
              <a
                key={key}
                className="text-blue-accent hover:underline"
                href={getMediaUrl(key)}
                target="_blank"
                rel="noreferrer"
              >
                {index + 1}
              </a>
            ))}
          </span>
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Review",
      cell: ({ row }) => (
        <span className="flex gap-2">
          <Button
            variant="forest"
            size="sm"
            onClick={() => onReview(row.original.id, "approve")}
          >
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReview(row.original.id, "reject")}
          >
            Reject
          </Button>
        </span>
      ),
    }),
  ]);
