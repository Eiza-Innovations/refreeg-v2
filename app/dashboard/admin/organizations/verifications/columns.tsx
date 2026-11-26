"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Small, Span } from "@/components/marketing/Typography";
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
        <Span className="flex flex-col">
          <Span className="font-medium text-ink">
            {row.original.organizationName}
          </Span>
          <Small className="text-ink/50">
            {[row.original.registrationNumber, row.original.country]
              .filter(Boolean)
              .join(" · ") || "No registration number"}
          </Small>
        </Span>
      ),
    }),
    columnHelper.accessor("adminEmail", {
      header: "Contact",
      cell: (info) => (
        <Span className="text-sm text-ink/70">{info.getValue()}</Span>
      ),
    }),
    columnHelper.accessor("submittedAt", {
      header: "Submitted",
      cell: ({ row }) => (
        <Span className="text-sm text-ink/70">
          {formatRelativeTime(row.original.submittedAt)}
        </Span>
      ),
    }),
    columnHelper.display({
      id: "documents",
      header: "Documents",
      cell: ({ row }) => {
        const companyDocs = [
          { label: "CAC Cert", key: row.original.registrationDocKey },
          { label: "Status Report", key: row.original.statusReportDocKey },
          { label: "MEMART", key: row.original.memartDocKey },
          { label: "SCUML", key: row.original.scumlDocKey },
          { label: "TIN", key: row.original.tinDocKey },
          { label: "Address", key: row.original.addressProofDocKey },
        ].filter((doc): doc is { label: string; key: string } =>
          Boolean(doc.key),
        );

        return (
          <span className="flex flex-col gap-1 text-sm">
            <span className="flex flex-wrap gap-x-2 gap-y-0.5">
              {companyDocs.map((doc) => (
                <a
                  key={doc.label}
                  className="font-medium text-blue-accent hover:underline"
                  href={getMediaUrl(doc.key)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {doc.label}
                </a>
              ))}
            </span>
            <Small className="text-ink/50">
              {row.original.directorIdKeys.length} director{" "}
              {row.original.directorIdKeys.length === 1 ? "ID" : "IDs"}:{" "}
              {row.original.directorIdKeys.map((key, index) => (
                <a
                  key={key}
                  className="mr-1.5 text-blue-accent hover:underline"
                  href={getMediaUrl(key)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {index + 1}
                </a>
              ))}
            </Small>
          </span>
        );
      },
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
