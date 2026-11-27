"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PartnerCategoryPicker } from "@/components/partners/partner-category-picker";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePartnerCreditMutations } from "@/hooks/use-partner-credits";
import { useValidator } from "@/hooks/use-validator";
import { partnerCategoryOptions } from "@/lib/options/partner-credits.options";
import {
  onboardPartnerSchema,
  type OnboardPartnerFormValues,
} from "@/lib/schemas/partner-credits.schema";

const defaultExpiryDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

const createInitialForm = (): OnboardPartnerFormValues => ({
  name: "",
  contactEmail: "",
  creditsToIssue: "",
  expiresAt: defaultExpiryDate(),
  eligibleCategories: ["education", "health"],
  rulesNote: "",
  maxPerCampaign: "",
  employeeMatchingEnabled: false,
  reconciliationRef: "",
  paymentReconciled: false,
});

export function OnboardPartnerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<OnboardPartnerFormValues>(createInitialForm);
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: onboardPartnerSchema,
  });
  const { onboardPartner } = usePartnerCreditMutations();

  const setFormFields = <K extends keyof OnboardPartnerFormValues>(
    key: K,
    value: OnboardPartnerFormValues[K],
  ) => {
    clearError(key);
    onboardPartner.reset();
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !onboardPartner.isPending) {
      setForm(createInitialForm());
      onboardPartner.reset();
    }
    onOpenChange(nextOpen);
  };

  const actionError =
    onboardPartner.error?.message ??
    (onboardPartner.data && !onboardPartner.data.success
      ? onboardPartner.data.error
      : undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || onboardPartner.isPending) return;

    onboardPartner.mutate(form, {
      onSuccess: (res) => {
        if (!res.success) return;
        toast.success("Partner onboarding sent for second-admin approval.");
        setForm(createInitialForm());
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-surface sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-fraunces text-2xl text-ink">
            Onboard a partner
          </DialogTitle>
          <DialogDescription>
            Issue prepaid partner credits and set campaign eligibility rules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="partner-name">Partner name</Label>
            <Input
              id="partner-name"
              placeholder="e.g. Flutterwave Foundation"
              value={form.name}
              onChange={(e) => setFormFields("name", e.target.value)}
            />
            <FieldError message={errors.name} />
          </div>

          <div>
            <Label htmlFor="partner-email">Contact email</Label>
            <Input
              id="partner-email"
              type="email"
              placeholder="impact@partner.org"
              value={form.contactEmail}
              onChange={(e) => setFormFields("contactEmail", e.target.value)}
            />
            <FieldError message={errors.contactEmail} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="partner-credits">Credits to issue (₦)</Label>
              <Input
                id="partner-credits"
                inputMode="decimal"
                placeholder="8,000,000"
                value={form.creditsToIssue}
                onChange={(e) =>
                  setFormFields("creditsToIssue", e.target.value)
                }
              />
              <FieldError message={errors.creditsToIssue} />
            </div>

            <div>
              <Label htmlFor="partner-expires">Expires</Label>
              <Input
                id="partner-expires"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setFormFields("expiresAt", e.target.value)}
              />
              <FieldError message={errors.expiresAt} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Eligible categories (leave empty for all causes)</Label>
            <PartnerCategoryPicker
              options={partnerCategoryOptions}
              selected={form.eligibleCategories}
              onChange={(next) => setFormFields("eligibleCategories", next)}
              disabled={onboardPartner.isPending}
            />
            <FieldError message={errors.eligibleCategories} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="partner-cap">
                Max per campaign (₦, optional)
              </Label>
              <Input
                id="partner-cap"
                inputMode="decimal"
                placeholder="1,000,000"
                value={form.maxPerCampaign}
                onChange={(e) =>
                  setFormFields("maxPerCampaign", e.target.value)
                }
              />
              <FieldError message={errors.maxPerCampaign} />
            </div>

            <div>
              <Label htmlFor="partner-ref">Reconciliation reference</Label>
              <Input
                id="partner-ref"
                placeholder="KOR-88213"
                value={form.reconciliationRef}
                onChange={(e) =>
                  setFormFields("reconciliationRef", e.target.value)
                }
              />
              <FieldError message={errors.reconciliationRef} />
            </div>
          </div>

          <div>
            <Label htmlFor="partner-rules-note">
              What credits can be used for (optional)
            </Label>
            <Input
              id="partner-rules-note"
              placeholder="e.g. Campaigns in Education and Health"
              value={form.rulesNote}
              onChange={(e) => setFormFields("rulesNote", e.target.value)}
            />
            <FieldError message={errors.rulesNote} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-hairline bg-bone px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-ink">Employee matching</p>
              <p className="text-xs text-ink/60">Display 1:1 matching rule</p>
            </div>
            <Switch
              checked={form.employeeMatchingEnabled}
              onCheckedChange={(checked) =>
                setFormFields("employeeMatchingEnabled", checked)
              }
            />
          </div>

          <div>
            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="partner-reconciled"
                checked={form.paymentReconciled}
                onCheckedChange={(checked) =>
                  setFormFields("paymentReconciled", checked === true)
                }
              />
              <Label
                htmlFor="partner-reconciled"
                className="cursor-pointer text-sm font-normal leading-snug text-ink"
              >
                Payment received and reconciled
                {form.reconciliationRef.trim()
                  ? ` (ref ${form.reconciliationRef.trim()})`
                  : ""}
              </Label>
            </div>
            <FieldError message={errors.paymentReconciled} />
          </div>

          <CalloutBanner
            variant="gold"
            icon={<ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink" />}
            title="Second admin approval required"
            description="Issuing credits needs a second admin to approve. The partner is invited by email once approved."
          />

          <FieldError message={actionError} />

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="surface"
              onClick={() => handleOpenChange(false)}
              disabled={onboardPartner.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="ink"
              disabled={onboardPartner.isPending}
            >
              {onboardPartner.isPending ? "Sending..." : "Send for approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
