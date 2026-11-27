"use client";

import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDialogContent } from "@/components/ui/responsive-dialog-content";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { signPetitionQuick } from "@/actions/petitions/sign-petition-actions";
import { SignFormFields } from "@/components/petitions/SignFormFields";
import { usePetitionSignForm } from "@/hooks/use-petition-sign-form";

export function SignModal({
  petitionId,
  petitionTitle,
  defaultName = "",
  defaultEmail = "",
  open,
  onOpenChange,
}: {
  petitionId: string;
  petitionTitle: string;
  defaultName?: string;
  defaultEmail?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { form, setFormFields, errors, validate } = usePetitionSignForm({
    name: defaultName,
    email: defaultEmail,
  });
  const signMutation = useMutation({
    mutationFn: () => signPetitionQuick({ petitionId, ...form }),
  });
  const signed = signMutation.data?.error === null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate() || signMutation.isPending) return;
    signMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md max-h-[85vh] sm:max-h-none overflow-y-auto">
        <DialogTitle>Sign this petition</DialogTitle>
        <p className="text-sm text-muted-foreground -mt-2">{petitionTitle}</p>

        {signed ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Thanks for signing! Your voice has been added.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <SignFormFields
              form={form}
              errors={errors}
              setFormFields={setFormFields}
              idPrefix="sign-modal"
            />
            <FieldError message={signMutation.data?.error ?? undefined} />
            <Button
              type="submit"
              disabled={signMutation.isPending}
              className="w-full"
            >
              {signMutation.isPending ? "Signing…" : "Sign this petition"}
            </Button>
          </form>
        )}
      </ResponsiveDialogContent>
    </Dialog>
  );
}
