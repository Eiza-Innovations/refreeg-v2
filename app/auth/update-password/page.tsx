"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthField } from "@/components/auth/AuthField";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { Heading, Lead } from "@/components/marketing/Typography";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { AuthLink } from "@/components/auth/AuthLink";
import { useUpdatePasswordForm } from "@/hooks/use-update-password-form";
import { signinBrand } from "@/lib/auth/signin-copy";

function UpdatePasswordForm() {
  const {
    hasToken,
    isCauseProfileFlow,
    form,
    setFormFields,
    errors,
    submitError,
    isSaving,
    handleSubmit,
  } = useUpdatePasswordForm();

  if (!hasToken) {
    return (
      <>
        <Heading as="h1" size="subsection">
          This link is invalid
        </Heading>
        <Lead className="mt-2 text-sm text-ink/70 md:text-sm">
          This password reset link is invalid or has expired. Request a new one
          and we&apos;ll email it right away.
        </Lead>
        <Button asChild variant="ink" className="mt-6 h-12 w-full rounded-md">
          <AuthLink
            href="/auth/reset-password"
            className="font-medium text-ink-foreground no-underline hover:no-underline"
          >
            Request a new link
          </AuthLink>
        </Button>
      </>
    );
  }

  return (
    <>
      <div className="mb-7">
        <Heading as="h1" size="subsection">
          {isCauseProfileFlow ? "Set your password" : "Choose a new password"}
        </Heading>
        <Lead className="mt-2 text-sm text-ink/70 md:text-sm">
          {isCauseProfileFlow
            ? "Welcome back! Set a secure password to access your campaign, then we'll guide you to complete your profile."
            : "Pick a strong password you haven't used elsewhere."}
        </Lead>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField
          id="password"
          type="password"
          label="New password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setFormFields("password", e.target.value)}
          error={errors.password}
        />
        <PasswordRequirements password={form.password} />
        <AuthField
          id="confirmPassword"
          type="password"
          label="Confirm new password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) => setFormFields("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
        />

        {submitError ? (
          <CalloutBanner
            variant="rust"
            role="alert"
            title={submitError}
            description={
              submitError.includes("expired")
                ? "Request a new reset link and try again."
                : undefined
            }
          />
        ) : null}

        <Button
          type="submit"
          variant="ink"
          disabled={isSaving}
          className="h-12 w-full rounded-md shadow-subtle"
        >
          {isSaving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isCauseProfileFlow ? (
            "Set password and continue"
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </>
  );
}

export default function UpdatePasswordPage() {
  return (
    <AuthShell brand={signinBrand}>
      <Suspense fallback={<div className="h-64" aria-busy="true" />}>
        <UpdatePasswordForm />
      </Suspense>
    </AuthShell>
  );
}
