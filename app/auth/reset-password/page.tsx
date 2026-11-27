"use client";

import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { AuthField } from "@/components/auth/AuthField";
import { AuthLink } from "@/components/auth/AuthLink";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthTrustNote } from "@/components/auth/AuthTrustNote";
import { Heading, Lead } from "@/components/marketing/Typography";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { useResetPasswordForm } from "@/hooks/use-reset-password-form";
import { signinBrand } from "@/lib/auth/signin-copy";

export default function ResetPasswordPage() {
  const {
    email,
    setEmail,
    emailError,
    submitError,
    isSending,
    isSent,
    handleSubmit,
    tryAnotherEmail,
  } = useResetPasswordForm();

  if (isSent) {
    return (
      <AuthShell brand={signinBrand}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cream-muted text-ink">
          <Mail className="h-5 w-5" />
        </div>
        <Heading as="h1" size="subsection" className="mt-6">
          Check your email
        </Heading>
        <Lead className="mt-2 text-sm text-ink/70 md:text-sm">
          If an account exists for <strong className="text-ink">{email}</strong>
          , we&apos;ve sent a link to reset your password. It expires in 1 hour.
        </Lead>
        <p className="mt-3 text-sm text-ink/60">
          Nothing there? Check your spam folder or try again.
        </p>
        <Button
          type="button"
          variant="surface"
          onClick={tryAnotherEmail}
          className="mt-6 h-12 w-full rounded-md"
        >
          Try another email
        </Button>
        <p className="mt-6 text-center text-sm text-ink/70">
          Remember your password?{" "}
          <AuthLink href="/auth/signin">Sign in</AuthLink>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell brand={signinBrand}>
      <AuthLink
        href="/auth/signin"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink/70 no-underline hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </AuthLink>
      <div className="mb-7">
        <Heading as="h1" size="subsection">
          Reset your password
        </Heading>
        <Lead className="mt-2 text-sm text-ink/70 md:text-sm">
          Enter your email address and we&apos;ll send you a link to choose a
          new password.
        </Lead>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField
          id="email"
          type="email"
          label="Email address"
          placeholder="name@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
        />

        {submitError ? (
          <CalloutBanner variant="rust" role="alert" title={submitError} />
        ) : null}

        <Button
          type="submit"
          variant="ink"
          aria-label="Send reset link"
          disabled={isSending}
          className="h-12 w-full rounded-md shadow-subtle"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Send reset link"
          )}
        </Button>

        <AuthTrustNote>
          Reset links are single-use and expire after an hour.
        </AuthTrustNote>

        <p className="pt-2 text-center text-sm text-ink/70">
          Don&apos;t have an account?{" "}
          <AuthLink href="/auth/signup">Sign up</AuthLink>
        </p>
      </form>
    </AuthShell>
  );
}
