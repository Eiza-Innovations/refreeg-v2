"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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

interface OrganizationDetailsStepProps {
  user: any;
  onNext: () => void;
  onBack: () => void;
  onboardingData: any;
  isSubmitting: boolean;
}

interface OrgDetailsForm {
  name: string;
  organisationType: string;
  registrationNumber: string;
  country: string;
  contactName: string;
  contactRole: string;
  adminEmail: string;
  phone: string;
  websiteUrl: string;
  username: string;
}

function Field({
  label,
  htmlFor,
  required,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-rust"> *</span> : null}
      </Label>
      <div className="mt-1.5">{children}</div>
      <FieldError message={error} />
    </div>
  );
}

export default function OrganizationDetailsStep({
  user,
  onNext,
  onBack,
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
  const [isLoading, setIsLoading] = useState(true);
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: organizationDetailsSchema,
  });

  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  useEffect(() => {
    const handle = form.username.trim();
    if (handle.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(handle, user?.id);
        setUsernameStatus(available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.username, user?.id]);

  useEffect(() => {
    const loadOrgData = async () => {
      if (!user?.id) return;
      try {
        const orgData = await getOrganizationOnboardingData(user.id);
        if (orgData) {
          setForm((prev) => ({
            ...prev,
            name: orgData.name || prev.name,
            organisationType: orgData.organisationType || "",
            registrationNumber: orgData.registrationNumber || "",
            country: orgData.country || "",
            contactRole: orgData.contactRole || "",
            phone: orgData.phone || prev.phone,
            websiteUrl: orgData.websiteUrl || "",
          }));
        }
        const profile = await getProfile(user.id);
        const existingUsername = profile?.username ?? "";
        if (existingUsername) {
          setForm((prev) => ({ ...prev, username: existingUsername }));
        }
      } catch (error) {
        console.error("Error loading organisation data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrgData();
  }, [user?.id]);

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
    onSuccess: () => onNext(),
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
    <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
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
        <div className="mt-8 flex gap-3 lg:mt-auto lg:pt-8">
          <Button
            type="button"
            variant="surface"
            onClick={onBack}
            className="h-12 px-8"
          >
            Back
          </Button>
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

      <Card variant="surface" className="p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
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
            />
          </Field>

          <Field
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
              <SelectTrigger id="orgType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {organisationTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
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
            />
          </Field>

          <Field
            label="Country of registration"
            htmlFor="orgCountry"
            required
            error={errors.country}
          >
            <Select
              value={form.country}
              onValueChange={(value) => setFormFields("country", value)}
            >
              <SelectTrigger id="orgCountry">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
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
            />
          </Field>

          <Field
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
            />
          </Field>

          <Field
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
            />
          </Field>

          <Field label="Phone" htmlFor="orgPhone" required error={errors.phone}>
            <Input
              id="orgPhone"
              type="tel"
              placeholder="+234 901 744 6760"
              value={form.phone}
              onChange={(event) => setFormFields("phone", event.target.value)}
            />
          </Field>

          <Field
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
            />
          </Field>

          <Field
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
          </Field>
        </div>
      </Card>
    </div>
  );
}
