"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { BountyFormFields } from "@/components/bounties/BountyFormFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBountyDraft } from "@/hooks/use-bounty-draft";
import { useToast } from "@/hooks/use-toast";
import { useValidator } from "@/hooks/use-validator";
import { emptyBountyForm } from "@/lib/bounties/bounty-mock-data";
import { bountySchema } from "@/lib/schemas/bounty.schema";

export function BountyForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { form, setFormFields, persistDraft } = useBountyDraft(emptyBountyForm);
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: bountySchema,
  });

  const updateField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setFormFields(key, value);
    clearError(key);
  };

  const handleReview = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    persistDraft();
    router.push("/bounties/new/review");
  };

  const handleSave = () => {
    persistDraft();
    toast({ title: "Draft saved" });
  };

  return (
    <form onSubmit={handleReview} className="space-y-6">
      <Card variant="surface">
        <CardContent className="grid gap-6 p-5 sm:p-8">
          <BountyFormFields
            form={form}
            errors={errors}
            onChange={updateField}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="surface" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="button" variant="subtle" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save draft
          </Button>
          <Button type="submit" variant="ink">
            Review bounty
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
