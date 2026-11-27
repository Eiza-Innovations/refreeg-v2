"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Timer } from "lucide-react";

import { AuthLink } from "@/components/auth/AuthLink";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthStepProgress } from "@/components/auth/AuthStepProgress";
import { Heading, Lead } from "@/components/marketing/Typography";
import { BeatOtpInput } from "@/components/ui/beat-otp-input";
import { Button } from "@/components/ui/button";
import { formatCountdown, useVerifyOtp } from "@/hooks/use-verify-otp";
import { safeRedirect } from "@/lib/auth/safe-redirect";
import { toast } from "sonner";

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const redirect = safeRedirect(searchParams.get("redirect"));
  const {
    otpCode,
    changeCode,
    submitCode,
    isVerifying,
    error,
    restartRequired,
    cooldown,
    resendCode,
    isResending,
  } = useVerifyOtp({
    email,
    redirect,
  });
  const restartHref = redirect
    ? `/auth/signup?redirect=${encodeURIComponent(redirect)}`
    : "/auth/signup";

  const handleVerifySubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submitCode(otpCode);
  };

  return (
    <AuthShell
      brand={{
        headline: "Check your inbox.",
        subtitle:
          "Enter the 6-digit code we emailed you. Paste it whole or type it. We strip spaces and the dash for you.",
        bottomCard: {
          eyebrow: "What we sent",
          text: `RefreeG: your 6-digit verification code was sent to ${email || "your email"}. It expires in 10 minutes. We will never ask you for it.`,
        },
      }}
    >
      <AuthStepProgress step={2} />

      <div className="mb-8">
        <Heading as="h1" size="subsection">
          Enter your code
        </Heading>
        <Lead className="mt-2 text-sm text-ink/70 md:text-sm">
          Sent to <span className="font-medium text-ink">{email}</span> ·{" "}
          <AuthLink href={`/auth/signup?email=${encodeURIComponent(email)}`}>
            Change email
          </AuthLink>
        </Lead>
      </div>

      <form onSubmit={handleVerifySubmit} className="space-y-6">
        <BeatOtpInput
          value={otpCode}
          onChange={changeCode}
          onComplete={submitCode}
          error={error}
          disabled={isVerifying}
          autoFocus
          placeholder="000000"
          onPasteSuccess={() => {
            toast.success("Code pasted from clipboard");
          }}
        />

        {restartRequired ? (
          <Button asChild variant="ink" className="h-12 w-full rounded-md">
            <AuthLink
              href={restartHref}
              className="font-medium text-ink-foreground no-underline hover:no-underline"
            >
              Start over
            </AuthLink>
          </Button>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-ink/55">
              <Timer className="h-4 w-4 shrink-0 text-ink/45" />
              {cooldown > 0 ? (
                <span>Resend code in {formatCountdown(cooldown)}</span>
              ) : (
                <Button
                  type="button"
                  variant="bare"
                  size="bare"
                  onClick={resendCode}
                  disabled={isResending}
                  className="font-semibold text-blue-accent hover:underline disabled:opacity-50"
                >
                  {isResending ? "Sending new code..." : "Resend code now"}
                </Button>
              )}
            </div>

            <Button
              type="submit"
              variant="ink"
              disabled={isVerifying || otpCode.length !== 6}
              className="h-12 w-full rounded-md shadow-subtle"
            >
              {isVerifying ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Verify and continue"
              )}
            </Button>
          </>
        )}
      </form>
    </AuthShell>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-cream" />}>
      <VerifyOtpContent />
    </Suspense>
  );
}
