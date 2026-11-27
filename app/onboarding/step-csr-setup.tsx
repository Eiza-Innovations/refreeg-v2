"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useValidator } from "@/hooks/use-validator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { csrSetupSchema } from "@/lib/schemas/csr-setup.schema";
import {
  csrFocusCauseOptions,
  financialYearStartOptions,
} from "@/lib/options/organization.options";
import { getOrganizationOnboardingData } from "@/actions/users/profile-actions";
import { formatThousands } from "@/lib/format-number-input";
import { CsrInviteRows } from "./csr-invite-rows";
import {
  inviteOrganizationMember,
  saveCsrSetup,
} from "@/actions/users/organization-actions";
import type {
  CsrForm,
  CsrSetupStepProps,
  InviteRow,
} from "@/types/onboarding-types";
import {
  fieldClass,
  selectTriggerClass,
  selectContentClass,
  selectItemClass,
} from "@/components/ui/field-styles";
import { onboardingSplitClass } from "@/components/onboarding/split-layout";

export default function CsrSetupStep({ user, onNext }: CsrSetupStepProps) {
  const [form, setForm] = useState<CsrForm>({
    csrBudget: "",
    csrFinancialYearStart: "",
    csrFocusCauses: [],
    csrMatchEmployeeDonations: false,
    csrMatchCap: "50000",
    csrPublicReport: false,
    invites: [{ email: "", role: "approver" }],
  });
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: csrSetupSchema,
  });

  const setFormFields = <K extends keyof CsrForm>(
    key: K,
    value: CsrForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError(key);
  };

  const toggleCause = (value: string) => {
    setForm((prev) => ({
      ...prev,
      csrFocusCauses: prev.csrFocusCauses.includes(value)
        ? prev.csrFocusCauses.filter((cause) => cause !== value)
        : [...prev.csrFocusCauses, value],
    }));
  };

  const queryClient = useQueryClient();

  // Fill the form once with what an earlier visit saved, so Back and refresh
  // do not make people re-enter their budget.
  const { data: saved } = useQuery({
    queryKey: ["onboarding-csr", user.id],
    queryFn: () => getOrganizationOnboardingData(user.id),
  });
  const prefilled = useRef(false);
  useEffect(() => {
    if (!saved || prefilled.current) return;
    prefilled.current = true;
    setForm((prev) => ({
      ...prev,
      csrBudget: saved.csrBudget
        ? formatThousands(String(saved.csrBudget))
        : prev.csrBudget,
      csrFinancialYearStart:
        saved.csrFinancialYearStart || prev.csrFinancialYearStart,
      csrFocusCauses: saved.csrFocusCauses.length
        ? saved.csrFocusCauses
        : prev.csrFocusCauses,
    }));
  }, [saved]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const inviteFailures: string[] = [];
      for (const invite of form.invites) {
        if (!invite.email.trim()) continue;
        const result = await inviteOrganizationMember({
          email: invite.email,
          role: invite.role,
        });
        if (!result.success) {
          inviteFailures.push(`${invite.email}: ${result.error}`);
        }
      }

      const save = await saveCsrSetup({
        csrBudget: Number(form.csrBudget.replace(/,/g, "")),
        csrFinancialYearStart: form.csrFinancialYearStart,
        csrFocusCauses: form.csrFocusCauses,
        csrMatchEmployeeDonations: form.csrMatchEmployeeDonations,
        csrMatchCap: form.csrMatchEmployeeDonations
          ? Number(form.csrMatchCap.replace(/,/g, ""))
          : undefined,
        csrPublicReport: form.csrPublicReport,
      });
      if (!save.success) throw new Error(save.error);
      return inviteFailures;
    },
    onSuccess: (inviteFailures) => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-csr"] });
      queryClient.invalidateQueries({
        queryKey: ["organization-onboarding-summary"],
      });
      if (inviteFailures.length) {
        toast({
          title: "Some invites could not be sent",
          description: inviteFailures.join(" · "),
          variant: "destructive",
        });
      }
      onNext();
    },
    onError: (error) =>
      toast({
        title: "Could not save CSR setup",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      }),
  });

  const handleContinue = () => {
    if (!validate()) return;
    if (saveMutation.isPending) return;
    saveMutation.mutate();
  };

  return (
    <div className={onboardingSplitClass}>
      <div className="flex flex-col">
        <h1 className="font-fraunces text-4xl font-medium text-ink sm:text-5xl">
          Set up CSR giving
        </h1>
        <p className="mt-4 text-base leading-7 text-ink/70">
          Decide how much your company plans to give, what it cares about and
          who can act on its behalf.
        </p>
        <div className="mt-8 flex gap-3 lg:mt-auto lg:pt-8">
          <Button
            type="button"
            variant="ink"
            onClick={handleContinue}
            disabled={saveMutation.isPending}
            className="h-12 px-10"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card variant="surface" className="p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="csrBudget">Annual giving budget</Label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/50">
                  ₦
                </span>
                <Input
                  id="csrBudget"
                  inputMode="numeric"
                  placeholder="25,000,000"
                  className={cn(fieldClass, "pl-8")}
                  value={form.csrBudget}
                  onChange={(event) =>
                    setFormFields(
                      "csrBudget",
                      formatThousands(event.target.value),
                    )
                  }
                />
              </div>
              <FieldError message={errors.csrBudget} />
            </div>

            <div>
              <Label htmlFor="csrYearStart">Financial year starts</Label>
              <div className="mt-1.5">
                <Select
                  value={form.csrFinancialYearStart}
                  onValueChange={(value) =>
                    setFormFields("csrFinancialYearStart", value)
                  }
                >
                  <SelectTrigger
                    id="csrYearStart"
                    className={selectTriggerClass}
                  >
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    {financialYearStartOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className={selectItemClass}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FieldError message={errors.csrFinancialYearStart} />
            </div>
          </div>

          <div className="mt-6">
            <Label>Focus causes</Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {csrFocusCauseOptions.map((option) => {
                const active = form.csrFocusCauses.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleCause(option.value)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "bg-ink text-ink-foreground"
                        : "bg-cream-muted text-ink hover:bg-warm-neutral",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <FieldError message={errors.csrFocusCauses} />
          </div>
        </Card>

        {/* Employee matching and a public CSR report are not built yet, so they are not offered here. */}
        <CsrInviteRows
          invites={form.invites}
          error={errors.invites}
          onChange={(next) => setFormFields("invites", next)}
        />
      </div>
    </div>
  );
}
