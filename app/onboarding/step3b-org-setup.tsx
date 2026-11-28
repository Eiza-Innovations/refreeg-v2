"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { CalloutBanner } from "@/components/ui/callout-banner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useValidator } from "@/hooks/use-validator";
import { toast } from "@/hooks/use-toast";
import { organizationDetailsSchema } from "@/lib/schemas/organization-details.schema";
import {
  countryOptions,
  organisationTypeOptions,
} from "@/lib/options/organization.options";
import { updateOrganization } from "@/actions/users/organization-actions";
import {
  checkUsernameAvailability,
  getOrganizationOnboardingData,
  getProfile,
} from "@/actions/users/profile-actions";
import { OnboardingField } from "@/components/onboarding/OnboardingField";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import type {
  OrganizationDetailsStepProps,
  OrgDetailsForm,
} from "@/types/onboarding-types";
import {
  fieldClass,
  selectTriggerClass,
  selectContentClass,
  selectItemClass,
} from "@/components/ui/field-styles";
import { onboardingSplitClass } from "@/components/onboarding/split-layout";

export default function OrganizationDetailsStep({
  user,
  onNext,
  onboardingData,
  isSubmitting,
}: OrganizationDetailsStepProps) {
  const [form, setForm] = useState<OrgDetailsForm>({
    name: "",
    organisationType: "",
    registrationNumber: "",
    country: "",
    contactName: user?.name || "",
    contactRole: "",
    adminEmail: user?.email || "",
    phone: "",
    websiteUrl: "",
    username: "",
  });
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: organizationDetailsSchema,
  });

  const queryClient = useQueryClient();
  const usernameStatus = useUsernameAvailability(form.username, user?.id);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["onboarding-organization", user.id],
    queryFn: async () => {
      const [org, profile] = await Promise.all([
        getOrganizationOnboardingData(user.id),
        getProfile(user.id),
      ]);
      return { org, username: profile?.username ?? "" };
    },
  });

  // Fill the form once with whatever was saved on an earlier visit.
  useEffect(() => {
    if (!existing) return;
    const { org, username } = existing;
    setForm((prev) => ({
      ...prev,
      name: org?.name || prev.name,
      organisationType: org?.organisationType || prev.organisationType,
      registrationNumber: org?.registrationNumber || prev.registrationNumber,
      country: org?.country || prev.country,
      contactRole: org?.contactRole || prev.contactRole,
      phone: org?.phone || prev.phone,
      websiteUrl: org?.websiteUrl || prev.websiteUrl,
      username: username || prev.username,
    }));
  }, [existing]);

  const setFormFields = <K extends keyof OrgDetailsForm>(
    key: K,
    value: OrgDetailsForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError(key);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const result = await updateOrganization({
        name: form.name.trim(),
        adminEmail: form.adminEmail.trim(),
        organisationType: form.organisationType,
        registrationNumber: form.registrationNumber.trim(),
        country: form.country,
        contactName: form.contactName.trim(),
        contactRole: form.contactRole.trim(),
        phone: form.phone.trim(),
        websiteUrl: form.websiteUrl.trim() || undefined,
        username: form.username.trim() || undefined,
        purpose: onboardingData.organizationPurpose || undefined,
      });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      // Without this, Back would show the form as it was before this save.
      queryClient.invalidateQueries({ queryKey: ["onboarding-organization"] });
      queryClient.invalidateQueries({
        queryKey: ["organization-onboarding-summary"],
      });
      onNext();
    },
    onError: (error) =>
      toast({
        title: "Could not save organisation details",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      }),
  });

  const handleContinue = () => {
    if (!validate()) return;
    if (usernameStatus === "taken") return;
    if (saveMutation.isPending || isSubmitting) return;
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-forest" />
      </div>
    );
  }

  const showCsrNote =
    onboardingData.organizationPurpose === "csr" ||
    onboardingData.organizationPurpose === "both";

  return (
    <div className={onboardingSplitClass}>
      <div className="flex flex-col">
        <h1 className="font-fraunces text-4xl font-medium text-ink sm:text-5xl">
          Tell us about your organisation
        </h1>
        <p className="mt-4 text-base leading-7 text-ink/70">
          These details appear on receipts and on your public profile. They are
          checked against your registration documents.
        </p>
        {showCsrNote ? (
          <CalloutBanner
            className="mt-6"
            variant="sand"
            icon={<ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />}
            title="Giving as a company (CSR) selected."
            description="Next we set your giving budget and team."
          />
        ) : null}
      </div>

      <Card variant="surface" className="p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <OnboardingField
            label="Organisation name"
            htmlFor="orgName"
            required
            error={errors.name}
          >
            <Input
              id="orgName"
              placeholder="Kora Payments Ltd"
              value={form.name}
              onChange={(event) => setFormFields("name", event.target.value)}
              className={fieldClass}
            />
          </OnboardingField>

          <OnboardingField
            label="Organisation type"
            htmlFor="orgType"
            required
            error={errors.organisationType}
          >
            <Select
              value={form.organisationType}
              onValueChange={(value) =>
                setFormFields("organisationType", value)
              }
            >
              <SelectTrigger id="orgType" className={selectTriggerClass}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                {organisationTypeOptions.map((option) => (
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
          </OnboardingField>

          <OnboardingField
            label="CAC registration number"
            htmlFor="orgRegistration"
            required
            error={errors.registrationNumber}
          >
            <Input
              id="orgRegistration"
              placeholder="RC 1482207"
              value={form.registrationNumber}
              onChange={(event) =>
                setFormFields("registrationNumber", event.target.value)
              }
              className={fieldClass}
            />
          </OnboardingField>

          <OnboardingField
            label="Country of registration"
            htmlFor="orgCountry"
            required
            error={errors.country}
          >
            <Select
              value={form.country}
              onValueChange={(value) => setFormFields("country", value)}
            >
              <SelectTrigger id="orgCountry" className={selectTriggerClass}>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                {countryOptions.map((option) => (
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
          </OnboardingField>

          <OnboardingField
            label="Your name"
            htmlFor="orgContactName"
            required
            error={errors.contactName}
          >
            <Input
              id="orgContactName"
              placeholder="Adeiza Jimoh"
              value={form.contactName}
              onChange={(event) =>
                setFormFields("contactName", event.target.value)
              }
              className={fieldClass}
            />
          </OnboardingField>

          <OnboardingField
            label="Your role"
            htmlFor="orgContactRole"
            required
            error={errors.contactRole}
          >
            <Input
              id="orgContactRole"
              placeholder="Head of Social Impact"
              value={form.contactRole}
              onChange={(event) =>
                setFormFields("contactRole", event.target.value)
              }
              className={fieldClass}
            />
          </OnboardingField>

          <OnboardingField
            label="Work email"
            htmlFor="orgEmail"
            required
            error={errors.adminEmail}
          >
            <Input
              id="orgEmail"
              type="email"
              placeholder="adeiza@korahq.com"
              value={form.adminEmail}
              onChange={(event) =>
                setFormFields("adminEmail", event.target.value)
              }
              className={fieldClass}
            />
          </OnboardingField>

          <OnboardingField
            label="Phone"
            htmlFor="orgPhone"
            required
            error={errors.phone}
          >
            <Input
              id="orgPhone"
              type="tel"
              placeholder="+234 901 744 6760"
              value={form.phone}
              onChange={(event) => setFormFields("phone", event.target.value)}
              className={fieldClass}
            />
          </OnboardingField>

          <OnboardingField
            label="Website (optional)"
            htmlFor="orgWebsite"
            error={errors.websiteUrl}
            className="sm:col-span-2"
          >
            <Input
              id="orgWebsite"
              inputMode="url"
              placeholder="korahq.com"
              value={form.websiteUrl}
              onChange={(event) =>
                setFormFields("websiteUrl", event.target.value)
              }
              className={fieldClass}
            />
          </OnboardingField>

          <OnboardingField
            label="Public handle (optional)"
            htmlFor="orgUsername"
            error={errors.username}
            className="sm:col-span-2"
          >
            <Input
              id="orgUsername"
              placeholder="greenpath_ng"
              value={form.username}
              onChange={(event) =>
                setFormFields("username", event.target.value.toLowerCase())
              }
              className={fieldClass}
            />
            <p
              className={`mt-1.5 text-sm ${
                usernameStatus === "available"
                  ? "text-forest"
                  : usernameStatus === "taken"
                    ? "text-rust"
                    : "text-ink/60"
              }`}
            >
              {form.username
                ? `Your public profile lives at refreeg.com/${form.username}. `
                : ""}
              {usernameStatus === "checking"
                ? "Checking availability..."
                : usernameStatus === "available"
                  ? "That handle is available."
                  : usernameStatus === "taken"
                    ? "That handle is already taken, try another."
                    : "Leave blank and one is generated from the organisation name."}
            </p>
          </OnboardingField>
        </div>
      </Card>

      <div className="border-t border-hairline pt-6 lg:col-span-2">
        <Button
          type="button"
          variant="ink"
          onClick={handleContinue}
          disabled={saveMutation.isPending || isSubmitting}
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
  );
}
