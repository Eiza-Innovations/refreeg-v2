"use client";

import { motion } from "framer-motion";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { LocationSelector } from "@/components/causes/LocationSelector";
import { OnboardingField } from "@/components/onboarding/OnboardingField";
import { ProfilePhotoPicker } from "@/components/onboarding/ProfilePhotoPicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfileStepForm } from "@/hooks/use-profile-step-form";
import type { Step3Props } from "@/types/onboarding-types";
import { fieldClass } from "@/components/ui/field-styles";
import { cn } from "@/lib/utils";
import { onboardingSplitClass } from "@/components/onboarding/split-layout";

export default function Step3({
  user,
  onNext,
  onboardingData,
  updateOnboardingData,
  isSubmitting,
}: Step3Props) {
  const {
    form,
    setFormFields,
    errors,
    usernameStatus,
    photoUrl,
    photoError,
    pickPhoto,
    submit,
  } = useProfileStepForm({
    user,
    onboardingData,
    updateOnboardingData,
    onNext,
  });

  return (
    <div className={onboardingSplitClass}>
      <div className="flex flex-col">
        <h1 className="font-fraunces text-4xl font-medium text-ink sm:text-5xl">
          Create your RefreeG profile
        </h1>
        <p className="mt-4 text-base leading-7 text-ink/70">
          It takes less than a minute. This is how people will see you.
        </p>
        <div className="mt-8 flex gap-3 lg:mt-auto lg:pt-8">
          <Button
            type="button"
            variant="ink"
            onClick={submit}
            disabled={isSubmitting}
            className="h-12 px-10"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving profile...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card variant="surface" className="space-y-5 p-6 sm:p-8">
          <ProfilePhotoPicker
            photoUrl={photoUrl}
            error={photoError}
            onPick={pickPhoto}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <OnboardingField
              label="First name"
              htmlFor="firstName"
              required
              error={errors.firstName}
            >
              <Input
                id="firstName"
                placeholder="Enter your first name"
                value={form.firstName}
                onChange={(e) => setFormFields("firstName", e.target.value)}
                className={fieldClass}
              />
            </OnboardingField>
            <OnboardingField
              label="Last name"
              htmlFor="lastName"
              required
              error={errors.lastName}
            >
              <Input
                id="lastName"
                placeholder="Enter your last name"
                value={form.lastName}
                onChange={(e) => setFormFields("lastName", e.target.value)}
                className={fieldClass}
              />
            </OnboardingField>
            <OnboardingField
              label="Username"
              htmlFor="username"
              required
              error={errors.username}
            >
              <div className="relative">
                <Input
                  id="username"
                  placeholder="Choose a unique username"
                  value={form.username}
                  onChange={(e) => setFormFields("username", e.target.value)}
                  className={cn(fieldClass, "pr-10")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking" && (
                    <Loader2 className="h-5 w-5 animate-spin text-ink/40" />
                  )}
                  {usernameStatus === "available" && (
                    <CheckCircle
                      className="h-5 w-5 text-forest"
                      aria-label="Username is available"
                    />
                  )}
                  {usernameStatus === "taken" && (
                    <XCircle
                      className="h-5 w-5 text-rust"
                      aria-label="Username is already taken"
                    />
                  )}
                </span>
              </div>
            </OnboardingField>
            <div>
              <LocationSelector
                selected={form.location}
                onChange={(value) => setFormFields("location", value)}
                mode="country"
                tone="new"
                label="Location"
                required
                placeholder="Select your country"
              />
              <FieldError message={errors.location} />
            </div>
            <OnboardingField
              label="Phone number"
              htmlFor="phone"
              required
              error={errors.phone}
            >
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={form.phone}
                onChange={(e) => setFormFields("phone", e.target.value)}
                className={fieldClass}
              />
            </OnboardingField>
            <OnboardingField label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                disabled
                value={user.email ?? ""}
                className={cn(fieldClass, "bg-cream-muted")}
              />
            </OnboardingField>
          </div>

          <div>
            <div className="flex items-start gap-2.5">
              {/* Native input: Radix Checkbox loops on its ref under React 19 here. */}
              <input
                id="consent"
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setFormFields("consent", e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-ink"
              />
              <Label
                htmlFor="consent"
                className="text-sm font-normal leading-relaxed text-ink/70"
              >
                I confirm that the information provided is accurate and consent
                to my data being verified securely.
              </Label>
            </div>
            <FieldError message={errors.consent} />
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
