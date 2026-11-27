"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import { Heading, Lead } from "@/components/marketing/Typography";
import { AlreadySignedInCard } from "@/components/auth/AlreadySignedInCard";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { AuthLink } from "@/components/auth/AuthLink";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthStepProgress } from "@/components/auth/AuthStepProgress";
import { AuthTrustNote } from "@/components/auth/AuthTrustNote";
import { SocialSignInButtons } from "@/components/auth/SocialSignInButtons";
import { safeRedirect } from "@/lib/auth/safe-redirect";
import { useSignupForm } from "@/hooks/use-signup-form";
import type { SignupVariant } from "@/types/auth-types";

export function SignupScreen({ variant }: { variant: SignupVariant }) {
  const {
    user,
    form,
    setFormFields,
    errors,
    submitError,
    termsError,
    loadingType,
    redirect,
    handleGoogleSignIn,
    handleSubmit,
  } = useSignupForm(variant);

  if (user) {
    const target = safeRedirect(redirect) || "/dashboard";
    return (
      <AuthShell brand={variant.brand}>
        <AlreadySignedInCard
          name={user.name}
          email={user.email}
          redirectTo={target}
          variant="signup"
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell brand={variant.brand}>
      <AuthStepProgress step={1} />

      <div className="mb-7">
        <Heading as="h1" size="subsection">
          {variant.title}
        </Heading>
        <Lead className="mt-2 text-sm text-ink/70 md:text-sm">
          Already have one? <AuthLink href="/auth/signin">Sign in</AuthLink>
        </Lead>
        <Lead className="mt-1 text-sm text-ink/70 md:text-sm">
          {variant.switchPrompt.text}{" "}
          <AuthLink href={variant.switchPrompt.href}>
            {variant.switchPrompt.linkLabel}
          </AuthLink>
        </Lead>
      </div>

      <SocialSignInButtons
        disabled={loadingType !== null}
        googleLoading={loadingType === "google"}
        onGoogle={handleGoogleSignIn}
      />

      <AuthDivider label={variant.divider} />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField
          id="email"
          type="email"
          label={variant.emailLabel}
          placeholder={variant.emailPlaceholder}
          value={form.email}
          onChange={(e) => setFormFields("email", e.target.value)}
          error={errors.email}
        />
        <AuthField
          id="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setFormFields("password", e.target.value)}
          error={errors.password}
        />
        <PasswordRequirements password={form.password} />
        <AuthField
          id="confirmPassword"
          type="password"
          label="Confirm password"
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={(e) => setFormFields("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
        />

        <div className="flex items-start gap-2.5 pt-2">
          {/* Native input: Radix Checkbox loops on its ref under React 19 here. */}
          <input
            id="agreeTerms"
            type="checkbox"
            checked={form.agreeTerms}
            onChange={(event) =>
              setFormFields("agreeTerms", event.target.checked)
            }
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-ink"
          />
          <Label
            htmlFor="agreeTerms"
            className="text-xs font-normal leading-relaxed text-ink/70"
          >
            I agree to the{" "}
            <AuthLink href="/terms" target="_blank">
              terms
            </AuthLink>{" "}
            and the{" "}
            <AuthLink href="/privacy" target="_blank">
              privacy policy
            </AuthLink>
            .
          </Label>
        </div>
        <FieldError message={termsError} className="-mt-2" />

        {submitError ? (
          <CalloutBanner
            variant="rust"
            role="alert"
            title={submitError}
            action={
              submitError.includes("already exists") ? (
                <AuthLink
                  href={
                    redirect
                      ? `/auth/signin?redirect=${encodeURIComponent(redirect)}`
                      : "/auth/signin"
                  }
                  className="shrink-0"
                >
                  Sign in
                </AuthLink>
              ) : undefined
            }
          />
        ) : null}

        <Button
          type="submit"
          variant="ink"
          aria-label={variant.submitAriaLabel}
          disabled={loadingType !== null}
          className="h-12 w-full rounded-md shadow-subtle"
        >
          {loadingType === "manual" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Send me a code"
          )}
        </Button>

        <AuthTrustNote>{variant.trustNote}</AuthTrustNote>
      </form>
    </AuthShell>
  );
}
