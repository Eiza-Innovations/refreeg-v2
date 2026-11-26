"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Check, Plus, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { ManagePartnerDialog } from "@/components/partners/manage-partner-dialog";
import { OnboardPartnerDialog } from "@/components/partners/onboard-partner-dialog";
import { RejectPartnerRequestDialog } from "@/components/partners/reject-partner-request-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  formatNairaCompact,
  formatNairaFull,
  useAdminPartnerCredits,
  usePartnerCreditMutations,
} from "@/hooks/use-partner-credits";
import { partnerStatusFilterOptions } from "@/lib/options/partner-credits.options";
import { cn } from "@/lib/utils";
import type {
  AdminPartnerCreditsDashboardData,
  PartnerAccountSummary,
  PartnerCreditRequestItem,
} from "@/types/partner-credit-types";
import { partnerColumns } from "./columns";

export function AdminPartnersClient({
  initialData,
}: {
  initialData: AdminPartnerCreditsDashboardData;
}) {
  const { data } = useAdminPartnerCredits(initialData);
  const { approveRequest } = usePartnerCreditMutations();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [managingPartner, setManagingPartner] =
    useState<PartnerAccountSummary | null>(null);
  const [rejectingRequest, setRejectingRequest] =
    useState<PartnerCreditRequestItem | null>(null);

  const filteredPartners =
    statusFilter === "all"
      ? data.partners
      : data.partners.filter((p) => p.status === statusFilter);

  const columns = useMemo(
    () => partnerColumns((partner) => setManagingPartner(partner)),
    [],
  );

  const handleApprove = (request: PartnerCreditRequestItem) => {
    if (approveRequest.isPending) return;
    approveRequest.mutate(request.id, {
      onSuccess: (res) => {
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success(
          `Approved ${formatNairaFull(request.amount)} for ${request.partnerName}.`,
        );
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Could not approve request.",
        );
      },
    });
  };

  const kpiCards = [
    { label: "Partners", value: String(data.kpis.partnerCount) },
    {
      label: "Credits issued",
      value: formatNairaCompact(data.kpis.creditsIssued),
    },
    { label: "Credits used", value: formatNairaCompact(data.kpis.creditsUsed) },
    {
      label: "Expiring in 30 days",
      value: formatNairaCompact(data.kpis.expiringIn30Days),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Eyebrow>People &amp; growth</Eyebrow>
            <Link
              href="/dashboard/admin/users"
              className="text-xs font-medium text-blue-accent hover:underline"
            >
              Manage all users &rarr;
            </Link>
          </div>
          <h1 className="font-fraunces text-3xl tracking-tight text-ink">
            Partner credits
          </h1>
          <p className="text-sm text-ink/65">
            Onboard CSR partners, approve reconciled credit grants, and track
            utilisation.
          </p>
        </div>

        <Button
          type="button"
          variant="ink"
          onClick={() => setOnboardOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Onboard partner
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} variant="surface" className="shadow-flat">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-ink/60">{kpi.label}</p>
              <p className="mt-1 font-fraunces text-2xl text-ink">
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.pendingRequests.length > 0 && (
        <Card variant="sand" className="border-gold/50">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-ink" />
                <p className="text-sm font-semibold text-ink">
                  Pending second-admin approval ({data.pendingRequests.length})
                </p>
              </div>
              <p className="text-xs text-ink/65">
                A second admin must approve before credits go live.
              </p>
            </div>

            <div className="divide-y divide-hairline rounded-xl border border-hairline bg-surface">
              {data.pendingRequests.map((req) => {
                const isSelf = req.requestedById === data.currentAdminId;
                return (
                  <div
                    key={req.id}
                    className="flex flex-col justify-between gap-3 p-3.5 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">
                          {req.partnerName}
                        </span>
                        <Badge variant="pending">
                          {req.kind === "initial_grant"
                            ? "Initial grant"
                            : "Top up"}
                        </Badge>
                        <span className="font-semibold text-ink">
                          {formatNairaFull(req.amount)}
                        </span>
                      </div>
                      <p className="text-xs text-ink/60">
                        Requested by {req.requesterName}
                        {req.reconciliationRef
                          ? ` · Ref ${req.reconciliationRef}`
                          : ""}
                      </p>
                    </div>

                    {isSelf ? (
                      <Badge variant="held">Awaiting second admin</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="surface"
                          size="sm"
                          disabled={approveRequest.isPending}
                          onClick={() => setRejectingRequest(req)}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Reject
                        </Button>
                        <Button
                          type="button"
                          variant="forest"
                          size="sm"
                          disabled={approveRequest.isPending}
                          onClick={() => handleApprove(req)}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Approve &amp; send invite
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {partnerStatusFilterOptions.map((opt) => {
          const active = statusFilter === opt.value;
          return (
            <Button
              key={opt.value}
              type="button"
              variant="bare"
              size="bare"
              onClick={() => {
                setStatusFilter(opt.value);
                setPageIndex(0);
              }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-ink bg-ink text-ink-foreground"
                  : "border-hairline bg-surface text-ink/70 hover:bg-bone hover:text-ink",
              )}
            >
              {opt.label}
            </Button>
          );
        })}
      </div>

      {filteredPartners.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-ink/50" />}
          title="No partners in this view"
          description="Onboard a partner organisation to issue prepaid CSR credits."
          action={
            <Button
              type="button"
              variant="ink"
              onClick={() => setOnboardOpen(true)}
            >
              Onboard partner
            </Button>
          }
        />
      ) : (
        <Card variant="surface" className="shadow-flat">
          <DataTable
            columns={columns}
            data={filteredPartners}
            pagination
            pageIndex={pageIndex}
            onPageIndexChange={setPageIndex}
          />
        </Card>
      )}

      <OnboardPartnerDialog open={onboardOpen} onOpenChange={setOnboardOpen} />
      <ManagePartnerDialog
        partner={managingPartner}
        open={managingPartner !== null}
        onOpenChange={(open) => {
          if (!open) setManagingPartner(null);
        }}
      />
      <RejectPartnerRequestDialog
        request={rejectingRequest}
        open={rejectingRequest !== null}
        onOpenChange={(open) => {
          if (!open) setRejectingRequest(null);
        }}
      />
    </div>
  );
}
