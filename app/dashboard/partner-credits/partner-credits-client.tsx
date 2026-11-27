"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Download, Plus, Sparkles } from "lucide-react";
import { AllocateCreditsDialog } from "@/components/partners/allocate-credits-dialog";
import { RequestTopUpDialog } from "@/components/partners/request-top-up-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import {
  downloadPartnerStatementCsv,
  formatNairaFull,
  usePartnerCredits,
} from "@/hooks/use-partner-credits";
import { partnerCategoryOptions } from "@/lib/options/partner-credits.options";
import type { PartnerCreditsDashboardData } from "@/types/partner-credit-types";
import { partnerActivityColumns } from "./columns";

function formatCategoriesLabel(values: readonly string[]): string {
  if (values.length === 0) return "All approved causes";
  return values
    .map(
      (v) => partnerCategoryOptions.find((opt) => opt.value === v)?.label ?? v,
    )
    .join(", ");
}

export function PartnerCreditsClient({
  initialData,
}: {
  initialData: PartnerCreditsDashboardData;
}) {
  const { data } = usePartnerCredits(initialData);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);

  const partner = data.partner;
  if (!partner) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          variant="page"
          icon={<Building2 className="h-7 w-7" />}
          title="No partner credit account yet"
          description="When RefreeG approves your organisation as a CSR partner, your credit balance and allocation workspace will appear here."
          action={
            <Button asChild variant="ink">
              <Link href="/discover">Explore campaigns</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const isExhausted =
    partner.status === "exhausted" || partner.creditsAvailable <= 0;
  const isSuspended = partner.status === "suspended";
  const canAllocate = !isExhausted && !isSuspended;

  const expiresLabel = new Date(partner.expiresAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const partnerSinceLabel = partner.partnerSince
    ? new Date(partner.partnerSince).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow>CSR Partner Workspace</Eyebrow>
          <h1 className="font-fraunces text-3xl tracking-tight text-ink">
            Partner credits
          </h1>
          <p className="text-sm text-ink/65">
            {partner.name}
            {partnerSinceLabel ? ` · partner since ${partnerSinceLabel}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {partner.isExpired && (
            <Badge variant="pending">Expired partner credits</Badge>
          )}
          {isExhausted && <Badge variant="held">Exhausted</Badge>}
          {isSuspended && <Badge variant="critical">Suspended</Badge>}
        </div>
      </div>

      {isSuspended && (
        <CalloutBanner
          variant="rust"
          title="Partner account suspended"
          description="Credit allocations and top ups are paused. Reach out to support@refreeg.com for assistance."
        />
      )}

      {data.pendingTopUpRequests.length > 0 && (
        <CalloutBanner
          variant="gold"
          title="Top up request pending admin approval"
          description={`${formatNairaFull(data.pendingTopUpRequests[0]!.amount)} requested · waiting for RefreeG admin verification.`}
        />
      )}

      <Card variant="ink" className="overflow-hidden border-ink/10">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <Eyebrow className="text-ink-foreground/65">
                Partner credits available
              </Eyebrow>
              <p className="mt-2 font-fraunces text-4xl tracking-tight text-ink-foreground sm:text-5xl">
                {formatNairaFull(partner.creditsAvailable)}
              </p>
              <p className="mt-2 text-sm text-ink-foreground/70">
                {formatNairaFull(partner.creditsUsed)} of{" "}
                {formatNairaFull(partner.creditsIssued)} used · expires{" "}
                {expiresLabel}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="lime"
                disabled={!canAllocate}
                onClick={() => setAllocateOpen(true)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Allocate credits
              </Button>
              <Button
                type="button"
                variant="surface"
                disabled={isSuspended}
                onClick={() => setTopUpOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Request top up
              </Button>
            </div>
          </div>

          <Progress
            value={partner.utilizationPct}
            indicatorVariant="lime"
            className="h-2 bg-ink-foreground/15"
            aria-label="Partner credit usage"
          />
        </CardContent>
      </Card>

      <div className="space-y-2.5">
        <Eyebrow>Rules set by RefreeG</Eyebrow>
        <Card variant="surface" className="shadow-flat">
          <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <div>
              <p className="text-xs text-ink/55">Eligible causes</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {formatCategoriesLabel(partner.eligibleCategories)}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink/55">Max per campaign</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {partner.maxPerCampaign != null
                  ? formatNairaFull(partner.maxPerCampaign)
                  : "No cap"}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink/55">Employee matching</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {partner.employeeMatchingEnabled
                  ? `On · ${partner.matchingRatio}`
                  : "Off"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-fraunces text-xl text-ink">Credit activity</h2>
          {data.transactions.length > 0 && (
            <Button
              type="button"
              variant="surface"
              size="sm"
              onClick={() =>
                downloadPartnerStatementCsv(partner.name, data.transactions)
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Download statement
            </Button>
          )}
        </div>

        {data.transactions.length === 0 ? (
          <EmptyState
            title="No credit activity yet"
            description="Allocations to eligible campaigns and approved top ups will appear here."
          />
        ) : (
          <Card variant="surface" className="shadow-flat">
            <DataTable
              columns={partnerActivityColumns}
              data={data.transactions}
              pagination
            />
          </Card>
        )}
      </div>

      <AllocateCreditsDialog
        partner={partner}
        causes={data.eligibleCauses}
        open={allocateOpen}
        onOpenChange={setAllocateOpen}
      />
      <RequestTopUpDialog
        partnerName={partner.name}
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
      />
    </div>
  );
}
