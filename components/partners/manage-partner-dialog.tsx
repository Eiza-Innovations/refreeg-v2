"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PartnerCategoryPicker } from "@/components/partners/partner-category-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/eyebrow";
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
import { Switch } from "@/components/ui/switch";
import {
  formatNairaFull,
  usePartnerCreditMutations,
} from "@/hooks/use-partner-credits";
import { useValidator } from "@/hooks/use-validator";
import {
  partnerCategoryOptions,
  partnerManageStatusOptions,
} from "@/lib/options/partner-credits.options";
import {
  managePartnerSchema,
  type ManagePartnerFormValues,
} from "@/lib/schemas/partner-credits.schema";
import type { PartnerAccountSummary } from "@/types/partner-credit-types";

const formFromPartner = (
  partner: PartnerAccountSummary,
): ManagePartnerFormValues => ({
  expiresAt: partner.expiresAt.slice(0, 10),
  eligibleCategories: [...partner.eligibleCategories],
  rulesNote: partner.rulesNote || "",
  maxPerCampaign:
    partner.maxPerCampaign != null ? String(partner.maxPerCampaign) : "",
  employeeMatchingEnabled: partner.employeeMatchingEnabled,
  status: partner.status === "suspended" ? "suspended" : "active",
  topUpAmount: "",
  topUpRef: "",
});

export function ManagePartnerDialog({
  partner,
  open,
  onOpenChange,
}: {
  partner: PartnerAccountSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<ManagePartnerFormValues>({
    expiresAt: new Date().toISOString().slice(0, 10),
    eligibleCategories: [],
    rulesNote: "",
    maxPerCampaign: "",
    employeeMatchingEnabled: false,
    status: "active",
    topUpAmount: "",
    topUpRef: "",
  });
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: managePartnerSchema,
  });
  const { updatePartner } = usePartnerCreditMutations();

  useEffect(() => {
    if (partner && open) {
      setForm(formFromPartner(partner));
      updatePartner.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner, open]);

  if (!partner) return null;

  const setFormFields = <K extends keyof ManagePartnerFormValues>(
    key: K,
    value: ManagePartnerFormValues[K],
  ) => {
    clearError(key);
    updatePartner.reset();
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const actionError =
    updatePartner.error?.message ??
    (updatePartner.data && !updatePartner.data.success
      ? updatePartner.data.error
      : undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || updatePartner.isPending) return;

    updatePartner.mutate(
      { partnerId: partner.id, input: form },
      {
        onSuccess: (res) => {
          if (!res.success) return;
          toast.success(
            form.topUpAmount
              ? "Partner settings saved and top-up queued for approval."
              : "Partner settings updated.",
          );
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-surface sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-fraunces text-2xl text-ink">
            Manage {partner.name}
          </DialogTitle>
          <DialogDescription>
            Available balance: {formatNairaFull(partner.creditsAvailable)} of{" "}
            {formatNairaFull(partner.creditsIssued)} issued.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="manage-status">Partner status</Label>
              <Select
                value={form.status}
                onValueChange={(val) =>
                  setFormFields("status", val as "active" | "suspended")
                }
              >
                <SelectTrigger id="manage-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {partnerManageStatusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.status} />
            </div>

            <div>
              <Label htmlFor="manage-expires">Expires</Label>
              <Input
                id="manage-expires"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setFormFields("expiresAt", e.target.value)}
              />
              <FieldError message={errors.expiresAt} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Eligible categories</Label>
            <PartnerCategoryPicker
              options={partnerCategoryOptions}
              selected={form.eligibleCategories}
              onChange={(next) => setFormFields("eligibleCategories", next)}
              disabled={updatePartner.isPending}
            />
            <FieldError message={errors.eligibleCategories} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="manage-cap">Max per campaign (₦)</Label>
              <Input
                id="manage-cap"
                inputMode="decimal"
                placeholder="No cap"
                value={form.maxPerCampaign}
                onChange={(e) =>
                  setFormFields("maxPerCampaign", e.target.value)
                }
              />
              <FieldError message={errors.maxPerCampaign} />
            </div>

            <div>
              <Label htmlFor="manage-rules-note">Rules summary note</Label>
              <Input
                id="manage-rules-note"
                value={form.rulesNote}
                onChange={(e) => setFormFields("rulesNote", e.target.value)}
              />
              <FieldError message={errors.rulesNote} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-hairline bg-bone px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-ink">Employee matching</p>
              <p className="text-xs text-ink/60">
                1:1 matching rule visibility
              </p>
            </div>
            <Switch
              checked={form.employeeMatchingEnabled}
              onCheckedChange={(checked) =>
                setFormFields("employeeMatchingEnabled", checked)
              }
            />
          </div>

          <div className="space-y-3 rounded-xl border border-hairline bg-bone p-3.5">
            <Eyebrow className="text-ink/60">
              Queue additional credit top up (optional)
            </Eyebrow>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="manage-topup">Top up amount (₦)</Label>
                <Input
                  id="manage-topup"
                  inputMode="decimal"
                  placeholder="2,000,000"
                  value={form.topUpAmount}
                  onChange={(e) => setFormFields("topUpAmount", e.target.value)}
                />
                <FieldError message={errors.topUpAmount} />
              </div>
              <div>
                <Label htmlFor="manage-topup-ref">Reconciliation ref</Label>
                <Input
                  id="manage-topup-ref"
                  placeholder="TOPUP-1042"
                  value={form.topUpRef}
                  onChange={(e) => setFormFields("topUpRef", e.target.value)}
                />
                <FieldError message={errors.topUpRef} />
              </div>
            </div>
          </div>

          <FieldError message={actionError} />

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="surface"
              onClick={() => onOpenChange(false)}
              disabled={updatePartner.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="ink"
              disabled={updatePartner.isPending}
            >
              {updatePartner.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
