"use client";

import { Button } from "@/components/ui/button";
import NavigationLoader from "@/components/layout/NavigationLoader";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { useOnboarding } from "@/hooks/use-onboarding";
import { OnboardingStepView } from "./OnboardingStepView";

const LATE_STEPS = ["kyc", "interests", "complete"];

export default function OnboardingPage() {
  const state = useOnboarding();

  if (state.loadError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-fraunces text-3xl font-medium text-ink">
          We couldn&apos;t load your progress
        </h1>
        <p className="text-sm leading-6 text-ink/70">
          Nothing you&apos;ve entered has been lost. Check your connection and
          try again.
        </p>
        <p className="text-xs text-ink/50">{state.loadError}</p>
        <Button variant="ink" className="h-12 px-8" onClick={state.retryLoad}>
          Try again
        </Button>
      </div>
    );
  }
  if (state.isLoading) return <NavigationLoader />;
  if (!state.user) return null;

  return (
    <OnboardingShell
      currentStep={state.currentStepIndex + 1}
      totalSteps={state.totalSteps}
      onBack={state.goBack}
      showUserNav={!state.isOrg && LATE_STEPS.includes(state.currentStepId)}
    >
      <OnboardingStepView state={state} user={state.user} />
    </OnboardingShell>
  );
}
