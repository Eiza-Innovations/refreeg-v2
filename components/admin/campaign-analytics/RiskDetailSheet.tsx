"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Snowflake, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FieldError } from "@/components/ui/field-error";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RiskSuggestionBadge } from "@/components/admin/campaign-analytics/RiskSuggestionBadge";
import { TakeDownCampaignDialog } from "@/components/admin/campaign-analytics/TakeDownCampaignDialog";
import { useToast } from "@/hooks/use-toast";
import { useRefreshCampaignAnalytics } from "@/hooks/use-campaign-analytics";
import { setCampaignRiskState } from "@/actions/admin/campaign-analytics-actions";
import { formatNairaShort } from "@/lib/causes/discover-summary";
import { formatRelativeTime } from "@/lib/format-date";
import { RISK_HIGH } from "@/lib/campaign-analytics/risk-levels";
import { cn } from "@/lib/utils";
import type { RiskRow } from "@/types/campaign-analytics-types";

export function RiskDetailSheet({
  campaign,
  onClose,
}: {
  campaign: RiskRow | null;
  onClose: () => void;
}) {
  const [takedownOpen, setTakedownOpen] = useState(false);
  const { toast } = useToast();
  const refreshAnalytics = useRefreshCampaignAnalytics();

  const stateMutation = useMutation({
    mutationFn: (action: "freeze" | "clear") =>
      setCampaignRiskState({ causeId: campaign!.id, action }),
    onSuccess: ({ error }, action) => {
      if (error) return;
      toast({
        title:
          action === "freeze"
            ? `${campaign!.title} frozen · donations paused`
            : `${campaign!.title} cleared · hidden from this list for 30 days`,
      });
      refreshAnalytics();
      onClose();
    },
  });
  const actionError = stateMutation.data?.error ?? stateMutation.error?.message;

  const facts = campaign
    ? [
        {
          label: "Raised",
          value: `${formatNairaShort(campaign.raised)} · ${campaign.donors} donors`,
        },
        {
          label: "Donations",
          value: campaign.frozen
            ? `Frozen · ${formatRelativeTime(campaign.frozenAt)}`
            : "Open",
        },
      ]
    : [];

  return (
    <Sheet open={campaign !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-5 overflow-y-auto bg-surface sm:max-w-md">
        {campaign && (
          <>
            <SheetHeader className="space-y-2 text-left">
              <Eyebrow className="truncate pr-6">
                Fraud risk · {campaign.title}
              </Eyebrow>
              <SheetTitle className="font-fraunces text-2xl font-normal text-ink">
                Risk score {campaign.score}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Signals behind this campaign&rsquo;s risk score and what you can
                do.
              </SheetDescription>
              <span className="block h-1.5 overflow-hidden rounded-full bg-cream-muted">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    campaign.score >= RISK_HIGH ? "bg-rust" : "bg-gold",
                  )}
                  style={{ width: `${campaign.score}%` }}
                />
              </span>
            </SheetHeader>

            <ul className="space-y-3">
              {campaign.signals.map((signal) => (
                <li key={signal.key} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rust/10 text-rust">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      {signal.label}
                    </span>
                    <span className="block text-xs text-ink/50">
                      +{signal.weight} points
                    </span>
                  </span>
                  <span className="max-w-[55%] text-right text-xs text-rust">
                    {signal.detail}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="space-y-2 border-t border-hairline pt-4 text-sm">
              {facts.map((fact) => (
                <div key={fact.label} className="flex justify-between gap-4">
                  <dt className="text-ink/50">{fact.label}</dt>
                  <dd className="text-right text-ink">{fact.value}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink/50">Suggested</dt>
                <dd>
                  <RiskSuggestionBadge suggestion={campaign.suggestion} />
                </dd>
              </div>
            </dl>

            <FieldError message={actionError} />

            <SheetFooter className="mt-auto flex-wrap gap-2 sm:justify-start sm:space-x-0">
              <Button variant="rust" onClick={() => setTakedownOpen(true)}>
                <X className="mr-2 h-4 w-4" />
                Take down campaign
              </Button>
              {!campaign.frozen && (
                <Button
                  variant="surface"
                  disabled={stateMutation.isPending}
                  onClick={() => stateMutation.mutate("freeze")}
                >
                  <Snowflake className="mr-2 h-4 w-4" />
                  Freeze
                </Button>
              )}
              <Button
                variant="surface"
                disabled={stateMutation.isPending}
                onClick={() => stateMutation.mutate("clear")}
              >
                {campaign.frozen ? "Clear and unfreeze" : "Clear"}
              </Button>
            </SheetFooter>

            <TakeDownCampaignDialog
              key={campaign.id}
              campaign={campaign}
              open={takedownOpen}
              onOpenChange={setTakedownOpen}
              onDone={onClose}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
