"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icons } from "@/components/layout/Icons";
import { Heading, P } from "@/components/marketing/Typography";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FieldError } from "@/components/ui/field-error";
import { Stepper } from "@/components/ui/stepper";
import { causeSteps } from "@/lib/options/cause.options";
import { LAST_CAUSE_STEP } from "@/hooks/use-cause-form";

type StepMeta = { title: string; description: string };

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  stepMeta: readonly StepMeta[];
  stepperLabels?: readonly string[];
  headerBadge?: string;
  currentStep: number;
  onStepSelect: (step: number) => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitLabel: string;
  busyLabel: string;
  busy: boolean;
  submitError?: string | null; // Added: Pass error from parent
  onSaveAndExit?: () => void;
  draftHasFiles?: boolean;
  /** Callout title shown on the last step above the submit button. */
  submitCalloutTitle?: string;
  /** Callout description shown on the last step above the submit button. */
  submitCalloutDescription?: string;
  children: ReactNode;
};

/** Shared frame for the create and edit cause wizards.
 * Also reused by Wishlists with custom labels/badges. */
export function CauseWizard({
  eyebrow = "Campaign builder",
  title,
  description,
  stepMeta,
  stepperLabels = causeSteps, // Default to cause steps
  headerBadge = "Milestone protected", // Default to cause badge
  currentStep,
  onStepSelect,
  onBack,
  onNext,
  onSubmit,
  submitLabel,
  busyLabel,
  busy,
  submitError,
  onSaveAndExit,
  draftHasFiles,
  submitCalloutTitle = "Ready to share?",
  submitCalloutDescription = "Once created, you'll get a unique link to share.",
  children,
}: Props) {
  const flowTopRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLElement>(null);
  const previousStepRef = useRef(currentStep);

  const activeStep = stepMeta[currentStep - 1];
  const nextStepLabel = stepperLabels[currentStep] || `Step ${currentStep + 1}`;
  const isReview = currentStep === stepMeta.length; // Dynamic last step check

  useEffect(() => {
    if (previousStepRef.current === currentStep) return;
    previousStepRef.current = currentStep;
    window.requestAnimationFrame(() => {
      stepHeadingRef.current?.focus({ preventScroll: true });
      flowTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [currentStep]);

  return (
    <div className="w-full bg-cream px-4 py-6 text-ink sm:px-6 lg:px-8 lg:py-9">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-8">
        {/* Left Rail */}
        <nav aria-label={title} className="space-y-3 lg:self-start lg:pt-1">
          <Eyebrow className="lg:px-3">{eyebrow}</Eyebrow>
          <Stepper
            variant="rail"
            steps={stepMeta.map((meta, index) => {
              const step = index + 1;
              return {
                label: stepperLabels[index] || meta.title,
                status:
                  step < currentStep
                    ? "done"
                    : step === currentStep
                      ? "current"
                      : "upcoming",
              };
            })}
            onStepSelect={busy ? undefined : onStepSelect}
          />
          {onSaveAndExit && (
            <div className="border-t border-hairline pt-2 lg:mx-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSaveAndExit}
                disabled={busy}
                className="-ml-2 px-2 text-ink"
              >
                Save and exit
              </Button>
              {draftHasFiles && (
                <P className="text-xs leading-5 text-ink/70">
                  You’ll need to add your selected files again when you return.
                </P>
              )}
            </div>
          )}
        </nav>

        {/* Main Content */}
        <div ref={flowTopRef} className="min-w-0 scroll-mt-28 space-y-5">
          <header ref={stepHeadingRef} tabIndex={-1} className="space-y-2">
            <Heading
              as="h1"
              tabIndex={-1}
              className="font-fraunces text-3xl font-medium tracking-tight sm:text-4xl"
            >
              {activeStep.title}
            </Heading>
            {description && (
              <P className="text-sm leading-6 text-ink/70">{description}</P>
            )}
            <P className="text-sm leading-6 text-ink/70">
              {activeStep.description}
            </P>
          </header>

          <form
            className="cause-flow space-y-5"
            autoComplete="off"
            onSubmit={(event) => event.preventDefault()}
          >
            <Card
              key={currentStep}
              variant="surface"
              className="space-y-6 rounded-2xl border-0 p-4 shadow-none sm:p-6"
            >
              {children}

              {/* Submit Action for Last Step */}
              {isReview && (
                <>
                  <FieldError message={submitError ?? undefined} />
                  <CalloutBanner
                    variant="sand"
                    className="flex-col sm:flex-row sm:items-center"
                    title={submitCalloutTitle}
                    description={submitCalloutDescription}
                    action={
                      <Button
                        type="button"
                        variant="ink"
                        disabled={busy}
                        onClick={onSubmit}
                        className="h-11 shrink-0 rounded-xl px-5"
                      >
                        {busy && (
                          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {busy ? busyLabel : submitLabel}
                      </Button>
                    }
                  />
                </>
              )}
            </Card>

            {/* Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {!isReview && (
                <Button
                  type="button"
                  variant="ink"
                  onClick={onNext}
                  className="h-11 rounded-xl px-5"
                >
                  Continue to {nextStepLabel.toLowerCase()}
                </Button>
              )}
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="subtle"
                  onClick={onBack}
                  disabled={busy}
                  className="h-11 rounded-xl px-5"
                >
                  Back
                </Button>
              )}
              {currentStep === 1 && onSaveAndExit && (
                <Button
                  type="button"
                  variant="subtle"
                  onClick={onSaveAndExit}
                  className="h-11 rounded-xl px-5"
                >
                  Save and finish later
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
