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
import {
  formatNairaFull,
  usePartnerCreditMutations,
} from "@/hooks/use-partner-credits";
import { useValidator } from "@/hooks/use-validator";
import {
  rejectPartnerRequestSchema,
  type RejectPartnerRequestFormValues,
} from "@/lib/schemas/partner-credits.schema";
import type { PartnerCreditRequestItem } from "@/types/partner-credit-types";

const initialForm: RejectPartnerRequestFormValues = { reason: "" };

export function RejectPartnerRequestDialog({
  request,
  open,
  onOpenChange,
}: {
  request: PartnerCreditRequestItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<RejectPartnerRequestFormValues>(initialForm);
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: rejectPartnerRequestSchema,
  });
  const { rejectRequest } = usePartnerCreditMutations();

  if (!request) return null;

  const setFormFields = (
    key: keyof RejectPartnerRequestFormValues,
    value: string,
  ) => {
    clearError(key);
    rejectRequest.reset();
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !rejectRequest.isPending) {
      setForm(initialForm);
      rejectRequest.reset();
    }
    onOpenChange(nextOpen);
  };

  const actionError =
    rejectRequest.error?.message ??
    (rejectRequest.data && !rejectRequest.data.success
      ? rejectRequest.data.error
      : undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || rejectRequest.isPending) return;

    rejectRequest.mutate(
      { requestId: request.id, reason: form.reason },
      {
        onSuccess: (res) => {
          if (!res.success) return;
          toast.success(`Rejected request for ${request.partnerName}.`);
          setForm(initialForm);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-fraunces text-2xl text-ink">
            Reject credit request
          </DialogTitle>
          <DialogDescription>
            Reject {formatNairaFull(request.amount)} for {request.partnerName}?
            No credits will be issued.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <Input
              id="reject-reason"
              placeholder="e.g. Payment reference not matched in bank"
              value={form.reason}
              onChange={(e) => setFormFields("reason", e.target.value)}
            />
            <FieldError message={errors.reason} />
          </div>

          <FieldError message={actionError} />

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="surface"
              onClick={() => handleOpenChange(false)}
              disabled={rejectRequest.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="rust"
              disabled={rejectRequest.isPending}
            >
              {rejectRequest.isPending ? "Rejecting..." : "Reject request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
