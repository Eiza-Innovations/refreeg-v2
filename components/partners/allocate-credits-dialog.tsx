"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatNairaFull,
  usePartnerCreditMutations,
} from "@/hooks/use-partner-credits";
import { useValidator } from "@/hooks/use-validator";
import {
  allocateCreditsSchema,
  type AllocateCreditsFormValues,
} from "@/lib/schemas/partner-credits.schema";
import type {
  EligibleCauseOption,
  PartnerAccountSummary,
} from "@/types/partner-credit-types";

const createInitialForm = (
  causes: readonly EligibleCauseOption[],
): AllocateCreditsFormValues => ({
  causeId: causes[0]?.id ?? "",
  amount: "",
  showAsSupporter: true,
});

export function AllocateCreditsDialog({
  partner,
  causes,
  open,
  onOpenChange,
}: {
  partner: PartnerAccountSummary;
  causes: readonly EligibleCauseOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<AllocateCreditsFormValues>(() =>
    createInitialForm(causes),
  );
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: allocateCreditsSchema,
  });
  const { allocateCredits } = usePartnerCreditMutations();

  const setFormFields = <K extends keyof AllocateCreditsFormValues>(
    key: K,
    value: AllocateCreditsFormValues[K],
  ) => {
    clearError(key);
    allocateCredits.reset();
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const parsedAmount = Number(form.amount.replace(/,/g, "").trim());
  const validAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  const remainingAfter = Math.max(0, partner.creditsAvailable - validAmount);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !allocateCredits.isPending) {
      setForm(createInitialForm(causes));
      allocateCredits.reset();
    } else if (nextOpen && !form.causeId && causes[0]) {
      setForm((prev) => ({ ...prev, causeId: causes[0]!.id }));
    }
    onOpenChange(nextOpen);
  };

  const actionError =
    allocateCredits.error?.message ??
    (allocateCredits.data && !allocateCredits.data.success
      ? allocateCredits.data.error
      : undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || allocateCredits.isPending) return;

    allocateCredits.mutate(form, {
      onSuccess: (res) => {
        if (!res.success) return;
        toast.success(
          `Allocated ${formatNairaFull(validAmount)} in partner credits.`,
        );
        setForm(createInitialForm(causes));
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-fraunces text-2xl text-ink">
            Allocate credits
          </DialogTitle>
          <DialogDescription>
            Direct your available balance to an eligible approved campaign.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="allocate-cause">Campaign</Label>
            <Select
              value={form.causeId}
              onValueChange={(val) => setFormFields("causeId", val)}
            >
              <SelectTrigger id="allocate-cause">
                <SelectValue placeholder="Choose an eligible campaign" />
              </SelectTrigger>
              <SelectContent>
                {causes.map((cause) => (
                  <SelectItem key={cause.id} value={cause.id}>
                    {cause.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.causeId} />
          </div>

          <div>
            <Label htmlFor="allocate-amount">Credits (₦)</Label>
            <Input
              id="allocate-amount"
              inputMode="decimal"
              placeholder="500,000"
              value={form.amount}
              onChange={(e) => setFormFields("amount", e.target.value)}
            />
            <p className="mt-1 text-xs text-ink/60">
              {formatNairaFull(partner.creditsAvailable)} available
              {partner.maxPerCampaign != null
                ? ` · up to ${formatNairaFull(partner.maxPerCampaign)} per campaign`
                : ""}
            </p>
            <FieldError message={errors.amount} />
          </div>

          <div className="flex items-start gap-2.5">
            <Checkbox
              id="allocate-supporter"
              checked={form.showAsSupporter}
              onCheckedChange={(checked) =>
                setFormFields("showAsSupporter", checked === true)
              }
            />
            <Label
              htmlFor="allocate-supporter"
              className="cursor-pointer text-sm font-normal leading-snug text-ink"
            >
              Show {partner.name} as a supporter on the campaign page
            </Label>
          </div>

          <div className="space-y-1.5 rounded-xl border border-hairline bg-bone p-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink/70">Campaign receives</span>
              <span className="font-semibold text-ink">
                {formatNairaFull(validAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/70">Credits left after</span>
              <span className="font-semibold text-ink">
                {formatNairaFull(remainingAfter)}
              </span>
            </div>
          </div>

          <FieldError message={actionError} />

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="surface"
              onClick={() => handleOpenChange(false)}
              disabled={allocateCredits.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="lime"
              disabled={allocateCredits.isPending || causes.length === 0}
            >
              {allocateCredits.isPending
                ? "Allocating..."
                : validAmount > 0
                  ? `Allocate ${formatNairaFull(validAmount)}`
                  : "Allocate credits"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
