"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import type { OnboardingStepViewProps } from "@/types/onboarding-types";

// next/dynamic only accepts an inline object literal for its options, so the
// shared fallback is a component and each call passes `{ loading: StepLoading }`.
const StepLoading = () => <Skeleton className="h-[400px] w-full" />;

const Step1 = dynamic(() => import("./step1"), { loading: StepLoading });
const Step2 = dynamic(() => import("./step2"), { loading: StepLoading });
const Step3 = dynamic(() => import("./step3"), { loading: StepLoading });
const OrganizationDetailsStep = dynamic(() => import("./step3b-org-setup"), {
  loading: StepLoading,
});
const CsrSetupStep = dynamic(() => import("./step-csr-setup"), {
  loading: StepLoading,
});
const ChecklistStep = dynamic(() => import("./step-checklist"), {
  loading: StepLoading,
});
const Step4 = dynamic(() => import("./step4"), { loading: StepLoading });
const Step5 = dynamic(() => import("./step5"), { loading: StepLoading });
const StepInterests = dynamic(() => import("./step-interests"), {
  loading: StepLoading,
});

const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

/** The animated current step of the onboarding wizard. */
export function OnboardingStepView({ state, user }: OnboardingStepViewProps) {
  const { onboardingData, updateOnboardingData, goNext, goBack } = state;

  return (
    <AnimatePresence mode="wait" custom={state.direction}>
      <motion.div
        key={state.currentStepId}
        custom={state.direction}
        variants={stepVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        className="w-full"
      >
        {state.currentStepId === "account-type" && (
          <Step1
            user={user}
            onNext={state.handleStep1Next}
            onboardingData={onboardingData}
          />
        )}
        {state.currentStepId === "gender" && (
          <Step2
            user={user}
            onNext={state.handleStep2Next}
            onboardingData={onboardingData}
            updateOnboardingData={updateOnboardingData}
          />
        )}
        {state.currentStepId === "profile" && (
          <Step3
            user={user}
            onNext={state.handleProfileSubmit}
            onboardingData={onboardingData}
            updateOnboardingData={updateOnboardingData}
            isSubmitting={state.isSubmitting}
          />
        )}
        {state.currentStepId === "org-details" && (
          <OrganizationDetailsStep
            user={user}
            onNext={goNext}
            onboardingData={onboardingData}
            isSubmitting={state.isSubmitting}
          />
        )}
        {state.currentStepId === "csr-setup" && (
          <CsrSetupStep
            user={user}
            onNext={goNext}
            onboardingData={onboardingData}
          />
        )}
        {state.currentStepId === "checklist" && (
          <ChecklistStep
            user={user}
            onComplete={state.handleComplete}
            onboardingData={onboardingData}
          />
        )}
        {state.currentStepId === "kyc" && (
          <Step4
            user={user}
            onNext={() => state.goToStep("interests")}
            onKyc={state.handleKyc}
            onboardingData={onboardingData}
            updateOnboardingData={updateOnboardingData}
          />
        )}
        {state.currentStepId === "interests" && (
          <StepInterests
            user={user}
            onNext={goNext}
            onboardingData={onboardingData}
            updateOnboardingData={updateOnboardingData}
          />
        )}
        {state.currentStepId === "complete" && (
          <Step5
            user={user}
            onComplete={state.handleComplete}
            onboardingData={onboardingData}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
