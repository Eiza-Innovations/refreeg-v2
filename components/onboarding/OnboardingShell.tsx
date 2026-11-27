import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthLogo } from "@/components/auth/AuthLogo";
import { AuthStepProgress } from "@/components/auth/AuthStepProgress";
import { UserNav } from "@/components/layout/UserNav";
import { Button } from "@/components/ui/button";
import type { OnboardingShellProps } from "@/types/onboarding-types";

/** Cream page with the logo, step progress and back button above each onboarding step. */
export function OnboardingShell({
  currentStep,
  totalSteps,
  onBack,
  showUserNav = false,
  children,
}: OnboardingShellProps) {
  return (
    <div className="min-h-screen w-full bg-cream">
      <header className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-5 sm:gap-6 sm:px-6">
        <AuthLogo variant="dark" className="hidden sm:inline-flex" />
        <AuthStepProgress
          step={currentStep}
          total={totalSteps}
          className="mb-0 flex-1"
        />
        {showUserNav ? (
          <UserNav />
        ) : (
          <Link
            href="/faq"
            className="shrink-0 text-sm text-ink/60 transition-colors hover:text-ink"
          >
            Need help?
          </Link>
        )}
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        {currentStep > 1 && onBack && (
          <Button
            variant="surface"
            size="sm"
            onClick={onBack}
            className="mb-6 gap-2 rounded-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        )}
        <div className="relative overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
