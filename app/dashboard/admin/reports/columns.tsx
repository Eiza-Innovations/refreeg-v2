"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { AlertTriangle, Ban, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableFeatures } from "@/components/ui/data-table-features";
import type { ModerationReportItem } from "@/lib/moderation/moderation-service";

const columnHelper = createColumnHelper<
  DataTableFeatures,
  ModerationReportItem
>();

interface ColumnHandlers {
  onDismiss: (report: ModerationReportItem) => void;
  onConfirmAction: (
    report: ModerationReportItem,
    action: "remove_content" | "block_user",
  ) => void;
  isBusy: boolean;
}

export const moderationReportColumns = ({
  onDismiss,
  onConfirmAction,
  isBusy,
}: ColumnHandlers) =>
  columnHelper.columns([
    columnHelper.display({
      id: "target",
      header: "Target",
      cell: ({ row }) => {
        const report = row.original;
        return (
          <div className="flex max-w-[240px] flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant="held" className="uppercase">
                {report.targetType}
              </Badge>
              <span className="font-mono text-xs text-ink/50">
                {report.targetId.slice(0, 8)}...
              </span>
            </div>
            {report.targetPreview ? (
              <p className="line-clamp-2 text-xs text-ink/80">
                &ldquo;{report.targetPreview}&rdquo;
              </p>
            ) : (
              <p className="text-xs italic text-ink/45">No preview available</p>
            )}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "reason",
      header: "Reason",
      cell: ({ row }) => {
        const report = row.original;
        return (
          <div className="max-w-[210px]">
            <p className="font-medium text-ink">{report.reason}</p>
            {report.details ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-ink/60">
                {report.details}
              </p>
            ) : null}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "reportedAccount",
      header: "Reported Account",
      cell: ({ row }) => {
        const report = row.original;
        if (!report.reportedUserId) {
          return <span className="text-xs text-ink/45">Unlinked</span>;
        }
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-ink">
              {report.reportedUserName || "User"}
            </span>
            {report.reportedUserEmail ? (
              <span className="text-xs text-ink/55">
                {report.reportedUserEmail}
              </span>
            ) : null}
            {report.reportedUserBlocked ? (
              <Badge variant="critical" className="mt-1 w-fit text-[10px]">
                Blocked
              </Badge>
            ) : null}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "reporter",
      header: "Reporter",
      cell: ({ row }) => {
        const report = row.original;
        return (
          <div className="flex flex-col">
            <span className="text-sm text-ink">
              {report.reporterName || "Mobile User"}
            </span>
            <span className="text-xs text-ink/55">
              {format(new Date(report.createdAt), "MMM d, HH:mm")}
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "status",
      header: "SLA / Status",
      cell: ({ row }) => {
        const report = row.original;
        if (report.status === "pending") {
          return report.isOverdue ? (
            <Badge variant="critical" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Overdue ({Math.abs(report.hoursRemaining)}h)
            </Badge>
          ) : (
            <Badge variant="pending" className="gap-1">
              <Clock className="h-3 w-3" />
              {report.hoursRemaining}h left
            </Badge>
          );
        }
        if (report.status === "actioned") {
          return (
            <Badge variant="verified" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Actioned
            </Badge>
          );
        }
        return <Badge variant="secondary">Dismissed</Badge>;
      },
    }),
    columnHelper.display({
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => {
        const report = row.original;
        if (report.status !== "pending") {
          return (
            <p className="text-right text-xs text-ink/55">
              {report.resolutionNote || "Resolved"}
            </p>
          );
        }
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="surface"
              disabled={isBusy}
              onClick={() => onDismiss(report)}
              className="h-8 text-xs"
            >
              Dismiss
            </Button>
            {report.targetType !== "user" ? (
              <Button
                type="button"
                size="sm"
                variant="subtle"
                disabled={isBusy}
                onClick={() => onConfirmAction(report, "remove_content")}
                className="h-8 gap-1 text-xs text-rust"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            ) : null}
            {report.reportedUserId ? (
              <Button
                type="button"
                size="sm"
                variant="rust"
                disabled={isBusy}
                onClick={() => onConfirmAction(report, "block_user")}
                className="h-8 gap-1 text-xs"
              >
                <Ban className="h-3.5 w-3.5" />
                Block User
              </Button>
            ) : null}
          </div>
        );
      },
    }),
  ]);
