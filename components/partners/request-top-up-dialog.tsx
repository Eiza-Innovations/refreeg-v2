"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { usePartnerCreditMutations } from "@/hooks/use-partner-credits";
import { useValidator } from "@/hooks/use-validator";
import {
  requestTopUpSchema,
  type RequestTopUpFormValues,
} from "@/lib/schemas/partner-credits.schema";

const initialForm: RequestTopUpFormValues = {
  amount: "",
  reconciliationRef: "",
  note: "",
};

export function RequestTopUpDialog({
  partnerName,
  open,
  onOpenChange,
}: {
  partnerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<RequestTopUpFormValues>(initialForm);
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: requestTopUpSchema,
  });
  const { requestTopUp } = usePartnerCreditMutations();

  const setFormFields = <K extends keyof RequestTopUpFormValues>(
    key: K,
    value: RequestTopUpFormValues[K],
  ) => {
    clearError(key);
    requestTopUp.reset();
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !requestTopUp.isPending) {
      setForm(initialForm);
      requestTopUp.reset();
    }
    onOpenChange(nextOpen);
  };

  const actionError =
    requestTopUp.error?.message ??
    (requestTopUp.data && !requestTopUp.data.success
      ? requestTopUp.data.error
      : undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || requestTopUp.isPending) return;

    requestTopUp.mutate(form, {
      onSuccess: (res) => {
        if (!res.success) return;
        toast.success("Top up request submitted for RefreeG admin approval.");
        setForm(initialForm);
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-fraunces text-2xl text-ink">
            Request top up
          </DialogTitle>
          <DialogDescription>
            Request additional credits for {partnerName}. A RefreeG admin will
            reconcile your transfer and approve the balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="topup-amount">Amount requested (₦)</Label>
            <Input
              id="topup-amount"
              inputMode="decimal"
              placeholder="2,000,000"
              value={form.amount}
              onChange={(e) => setFormFields("amount", e.target.value)}
            />
            <FieldError message={errors.amount} />
          </div>

          <div>
            <Label htmlFor="topup-ref">Transfer reference (optional)</Label>
            <Input
              id="topup-ref"
              placeholder="e.g. KOR-99104"
              value={form.reconciliationRef}
              onChange={(e) =>
                setFormFields("reconciliationRef", e.target.value)
              }
            />
            <FieldError message={errors.reconciliationRef} />
          </div>

          <div>
            <Label htmlFor="topup-note">Note (optional)</Label>
            <Input
              id="topup-note"
              placeholder="Q4 matching budget extension"
              value={form.note}
              onChange={(e) => setFormFields("note", e.target.value)}
            />
            <FieldError message={errors.note} />
          </div>

          <FieldError message={actionError} />

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="surface"
              onClick={() => handleOpenChange(false)}
              disabled={requestTopUp.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="ink"
              disabled={requestTopUp.isPending}
            >
              {requestTopUp.isPending ? "Submitting..." : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
