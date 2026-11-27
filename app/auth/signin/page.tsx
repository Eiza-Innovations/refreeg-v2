"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useSigninForm } from "@/hooks/use-signin-form";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Heading, Lead } from "@/components/marketing/Typography";
import { AlreadySignedInCard } from "@/components/auth/AlreadySignedInCard";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthField } from "@/components/auth/AuthField";
import { AuthLink } from "@/components/auth/AuthLink";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthTrustNote } from "@/components/auth/AuthTrustNote";
import { SocialSignInButtons } from "@/components/auth/SocialSignInButtons";
import { safeRedirect } from "@/lib/auth/safe-redirect";
import { signinBrand } from "@/lib/auth/signin-copy";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const hasShownAuthNotice = useRef(false);
  const {
    user,
    isLoading,
    form,
    setFormFields,
    errors,
    submitError,
    loadingType,
    handleSubmit,
    handleGoogleSignIn,
  } = useSigninForm(redirectTo);

  useEffect(() => {
    router.prefetch("/petitions");
    router.prefetch("/dashboard");
    router.prefetch("/auth/signup");
    router.prefetch("/auth/signup/organization");
    router.prefetch("/auth/reset-password");
  }, [router]);

  useEffect(() => {
    if (user) return;
    if (redirectTo && !hasShownAuthNotice.current) {
      toast({
        title: "Sign in required",
        description: "You need to log in first to continue.",
      });
      hasShownAuthNotice.current = true;
    }
  }, [redirectTo, user]);

  if (isLoading) {
    return <div className="min-h-screen w-full bg-cream" />;
  }

  if (user) {
    return (
      <AuthShell brand={signinBrand}>
        <AlreadySignedInCard
          name={user.name}
          email={user.email}
          redirectTo={safeRedirect(redirectTo) || "/dashboard"}
          variant="signin"
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell brand={signinBrand}>
      <div className="mb-7">
        <Heading as="h1" size="subsection">
          Welcome back
        </Heading>
        <Lead className="mt-2 text-sm text-ink/70 md:text-sm">
          Don&apos;t have an account?{" "}
          <AuthLink
            href={
              redirectTo
                ? `/auth/signup?redirect=${encodeURIComponent(redirectTo)}`
                : "/auth/signup"
            }
          >
            Sign up
          </AuthLink>
        </Lead>
        <Lead className="mt-1 text-sm text-ink/70 md:text-sm">
          Registering as an organization?{" "}
          <AuthLink href="/auth/signup/organization">
            Create an organization account
          </AuthLink>
        </Lead>
      </div>

      {redirectTo && (
        <CalloutBanner
          variant="gold"
          title="You need to log in first to continue."
          className="mb-6"
        />
      )}

      <SocialSignInButtons
        disabled={loadingType !== null}
        googleLoading={loadingType === "google"}
        onGoogle={handleGoogleSignIn}
      />

      <AuthDivider label="Or use your email" />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField
          id="email"
          type="email"
          label="Email address"
          placeholder="name@example.com"
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
          labelAction={
            <AuthLink
              href="/auth/reset-password"
              className="text-xs font-medium text-ink/60 hover:text-ink"
            >
              Forgot password?
            </AuthLink>
          }
        />

        {submitError ? (
          <CalloutBanner
            variant="rust"
            role="alert"
            title={
              submitError === "Invalid credentials"
                ? "Incorrect email or password."
                : submitError
            }
            description={
              submitError === "Invalid credentials"
                ? "Check them and try again. After 5 wrong attempts sign-in pauses for 15 minutes; resetting your password gets you back in straight away."
                : undefined
            }
          />
        ) : null}

        <Button
          type="submit"
          variant="ink"
          aria-label="Sign In"
          disabled={loadingType !== null}
          className="mt-2 h-12 w-full rounded-md shadow-subtle"
        >
          {loadingType === "manual" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Sign in"
          )}
        </Button>

        <AuthTrustNote>
          Protected by end-to-end cryptographic verification. Your data is never
          shared.
        </AuthTrustNote>

        <p className="pt-2 text-center text-xs leading-relaxed text-ink/60">
          By signing in, you agree to our{" "}
          <AuthLink href="/terms" target="_blank" className="text-ink">
            Terms of Service
          </AuthLink>{" "}
          and{" "}
          <AuthLink href="/privacy" target="_blank" className="text-ink">
            Privacy Policy
          </AuthLink>
          .
        </p>
      </form>
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-cream" />}>
      <SignInContent />
    </Suspense>
  );
}
