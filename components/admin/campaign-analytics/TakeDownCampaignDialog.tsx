"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useValidator } from "@/hooks/use-validator";
import { useRefreshCampaignAnalytics } from "@/hooks/use-campaign-analytics";
import { useRefreshAdminShell } from "@/hooks/use-admin-shell";
import { TakedownFundsField } from "@/components/admin/campaign-analytics/TakedownFundsField";
import { takeDownCampaign } from "@/actions/admin/campaign-moderation-actions";
import { takedownReasonOptions } from "@/lib/options/campaign-analytics.options";
import {
  takedownCampaignSchema,
  type TakedownCampaignInput,
} from "@/lib/schemas/campaign-analytics.schema";
import type { RiskRow } from "@/types/campaign-analytics-types";

export function TakeDownCampaignDialog({
  campaign,
  open,
  onOpenChange,
  onDone,
}: {
  campaign: RiskRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    causeId: campaign.id,
    reason: "" as TakedownCampaignInput["reason"] | "",
    funds: "refund" as TakedownCampaignInput["funds"],
    suspendCreator: true,
    notifyDonors: true,
    note: "",
  });
  const setFormFields = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "reason" || key === "note") clearError(key);
  };
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: takedownCampaignSchema,
  });
  const { toast } = useToast();
  const refreshAnalytics = useRefreshCampaignAnalytics();
  const refreshAdminShell = useRefreshAdminShell();
  const donorsLabel = `${campaign.donors} donor${campaign.donors === 1 ? "" : "s"}`;

  const takedownMutation = useMutation({
    mutationFn: () => takeDownCampaign(form as TakedownCampaignInput),
    onSuccess: ({ error }) => {
      if (error) {
        setSubmitError(error);
        return;
      }
      toast({
        title:
          form.funds === "refund"
            ? `Campaign taken down · refund queued for ${donorsLabel}`
            : "Campaign taken down · funds held for investigation",
      });
      refreshAnalytics();
      refreshAdminShell();
      onOpenChange(false);
      onDone();
    },
    onError: (mutationError) => setSubmitError(mutationError.message),
  });

  const handleSubmit = () => {
    setSubmitError(null);
    if (!validate() || takedownMutation.isPending) return;
    takedownMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rust/10 text-rust">
              <X className="h-5 w-5" />
            </span>
            Take down “{campaign.title}”
          </DialogTitle>
          <DialogDescription>
            Removes the campaign from RefreeG and stops all donations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="takedown-reason">Reason</Label>
            <Select
              value={form.reason}
              onValueChange={(value) =>
                setFormFields(
                  "reason",
                  value as TakedownCampaignInput["reason"],
                )
              }
            >
              <SelectTrigger id="takedown-reason" className="bg-surface">
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                {takedownReasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.reason} />
          </div>

          <TakedownFundsField
            value={form.funds}
            onChange={(value) => setFormFields("funds", value)}
            donors={campaign.donors}
            raised={campaign.raised}
          />

          <div className="space-y-2.5">
            <label className="flex items-center gap-3 text-sm text-ink">
              <Checkbox
                checked={form.suspendCreator}
                onCheckedChange={(checked) =>
                  setFormFields("suspendCreator", checked === true)
                }
              />
              Suspend the creator&rsquo;s account
            </label>
            <label className="flex items-center gap-3 text-sm text-ink">
              <Checkbox
                checked={form.notifyDonors}
                onCheckedChange={(checked) =>
                  setFormFields("notifyDonors", checked === true)
                }
              />
              Email donors why the campaign was removed
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="takedown-note">Note for the audit log</Label>
            <Textarea
              id="takedown-note"
              value={form.note}
              onChange={(event) => setFormFields("note", event.target.value)}
              placeholder="What you checked and why (optional)"
              className="min-h-[72px]"
            />
            <FieldError message={errors.note ?? submitError ?? undefined} />
          </div>

          <CalloutBanner
            variant="rust"
            icon={
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rust" />
            }
            title="Takedowns can't be undone."
            description="The campaign page will show “Removed after review”."
          />
        </div>

        <DialogFooter>
          <Button
            variant="surface"
            onClick={() => onOpenChange(false)}
            disabled={takedownMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="rust"
            onClick={handleSubmit}
            disabled={takedownMutation.isPending}
          >
            <X className="mr-2 h-4 w-4" />
            {takedownMutation.isPending ? "Taking down..." : "Take down"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
