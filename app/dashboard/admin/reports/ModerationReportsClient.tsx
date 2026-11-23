"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Clock, Flag } from "lucide-react";
import { resolveModerationReportAction } from "@/actions/admin/moderation-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { toast } from "@/hooks/use-toast";
import { DATA_RETENTION_POLICY } from "@/lib/config/retention";
import type {
  ModerationAction,
  ModerationReportItem,
} from "@/lib/moderation/moderation-service";
import { moderationStatusTabOptions } from "@/lib/options/moderation-reports.options";
import { cn } from "@/lib/utils";
import { moderationReportColumns } from "./columns";
import {
  ModerationActionDialog,
  type PendingModerationTarget,
} from "./ModerationActionDialog";

interface ModerationCounts {
  pending: number;
  actioned: number;
  dismissed: number;
  overdue: number;
}

interface ModerationReportsClientProps {
  reports: ModerationReportItem[];
  counts: ModerationCounts;
  activeStatus: "pending" | "actioned" | "dismissed" | "all";
}

export function ModerationReportsClient({
  reports,
  counts,
  activeStatus,
}: ModerationReportsClientProps) {
  const router = useRouter();
  const [confirmTarget, setConfirmTarget] =
    useState<PendingModerationTarget | null>(null);

  const moderationMutation = useMutation({
    mutationFn: ({
      reportId,
      action,
    }: {
      reportId: string;
      action: ModerationAction;
    }) => resolveModerationReportAction(reportId, action),
    onSuccess: (result) => {
      if (!result.success) {
        toast({
          title: "Moderation update failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      setConfirmTarget(null);
      toast({
        title: "Moderation updated",
        description: result.message,
      });
      router.refresh();
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Moderation update failed",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });

  const isBusy = moderationMutation.isPending;
  const { mutate: applyModeration } = moderationMutation;

  const columns = useMemo(
    () =>
      moderationReportColumns({
        isBusy,
        onDismiss: (report) =>
          applyModeration({ reportId: report.id, action: "dismiss" }),
        onConfirmAction: (report, action) =>
          setConfirmTarget({ report, action }),
      }),
    [isBusy, applyModeration],
  );

  const tabCounts: Record<
    (typeof moderationStatusTabOptions)[number]["value"],
    number
  > = {
    pending: counts.pending,
    actioned: counts.actioned,
    dismissed: counts.dismissed,
    all: counts.pending + counts.actioned + counts.dismissed,
  };

  const statCards = [
    {
      label: "Pending Review",
      value: counts.pending,
      hint: "Awaiting moderator decision",
      tone: "text-ink",
      highlight: false,
    },
    {
      label: `Overdue (>${DATA_RETENTION_POLICY.MODERATION_SLA_HOURS}h)`,
      value: counts.overdue,
      hint: "Requires immediate escalation",
      tone: counts.overdue > 0 ? "text-rust" : "text-ink",
      highlight: counts.overdue > 0,
    },
    {
      label: "Actioned",
      value: counts.actioned,
      hint: "Content removed or account blocked",
      tone: "text-forest",
      highlight: false,
    },
    {
      label: "Dismissed",
      value: counts.dismissed,
      hint: "Reviewed with no violation",
      tone: "text-ink/75",
      highlight: false,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow className="text-ink/45">Safety &amp; Compliance</Eyebrow>
          <h1 className="mt-1 font-fraunces text-3xl tracking-tight text-ink">
            UGC Moderation Queue
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Review reported campaigns, petitions, comments, and user blocks
            within the {DATA_RETENTION_POLICY.MODERATION_SLA_HOURS}-hour SLA.
          </p>
        </div>
        <Badge variant="blue" className="w-fit gap-1.5 px-3 py-1.5">
          <Clock className="h-3.5 w-3.5" />
          Target SLA: {DATA_RETENTION_POLICY.MODERATION_SLA_HOURS} Hours
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.label}
            variant="surface"
            className={cn(
              "shadow-none",
              card.highlight && "border-rust/40 bg-rust/5",
            )}
          >
            <CardHeader className="pb-2">
              <CardDescription className={card.highlight ? "text-rust" : ""}>
                {card.label}
              </CardDescription>
              <CardTitle className={cn("font-fraunces text-2xl", card.tone)}>
                {card.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-ink/55">
              {card.hint}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card variant="surface" className="shadow-none">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 font-fraunces text-ink">
                <Flag className="h-4 w-4 text-rust" />
                Reports
              </CardTitle>
              <CardDescription>
                Dismiss non-violating items or remove offending content and
                block abusive accounts.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {moderationStatusTabOptions.map((tab) => {
                const isSelected = activeStatus === tab.value;
                const href =
                  tab.value === "all"
                    ? "/dashboard/admin/reports"
                    : `/dashboard/admin/reports?status=${tab.value}`;
                return (
                  <Link
                    key={tab.value}
                    href={href}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                      isSelected
                        ? "border-ink bg-ink text-ink-foreground"
                        : "border-hairline bg-surface text-ink/75 hover:bg-cream-muted",
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px]",
                        isSelected
                          ? "bg-ink-foreground/20 text-ink-foreground"
                          : "bg-cream-muted text-ink/65",
                      )}
                    >
                      {tabCounts[tab.value]}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <EmptyState
              icon={<Flag className="h-5 w-5" />}
              title="No reports in this queue"
              description="User reports for comments, campaigns, petitions, and blocked accounts appear here for review."
            />
          ) : (
            <DataTable
              columns={columns}
              data={reports}
              pagination
              pageSize={15}
            />
          )}
        </CardContent>
      </Card>

      <ModerationActionDialog
        target={confirmTarget}
        isPending={isBusy}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (!confirmTarget) return;
          moderationMutation.mutate({
            reportId: confirmTarget.report.id,
            action: confirmTarget.action,
          });
        }}
      />
    </div>
  );
}
