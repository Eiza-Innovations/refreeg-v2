import * as React from "react";

import { cn } from "@/lib/utils";

export interface StepperStep {
  label: string;
  status: "done" | "current" | "upcoming";
}

export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: StepperStep[];
  variant?: "default" | "rail";
  /** Called with the 1-based step number when a completed step is clicked. */
  onStepSelect?: (step: number) => void;
}

const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(
  ({ steps, onStepSelect, variant = "default", className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn(
        "flex w-full items-center",
        variant === "rail" && "flex-wrap gap-1 lg:flex-col lg:items-stretch",
        className,
      )}
      {...props}
    >
      {steps.map((step, i) => {
        const selectable = step.status === "done" && !!onStepSelect;
        const rail = variant === "rail";
        const itemClass = rail
          ? cn(
              "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm lg:gap-3 lg:px-3 lg:py-2.5",
              step.status === "current" && "bg-surface font-semibold",
            )
          : "flex flex-col items-center gap-2";
        const content = (
          <>
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                step.status === "done" &&
                  "border-lime bg-lime text-lime-foreground",
                step.status === "current" &&
                  "border-ink bg-ink text-ink-foreground",
                step.status === "upcoming" &&
                  "border-ink/20 bg-transparent text-ink/40",
                rail && "shrink-0 border-transparent",
                rail &&
                  step.status === "done" &&
                  "bg-forest text-forest-foreground",
                rail &&
                  step.status === "upcoming" &&
                  "bg-warm-neutral text-ink/70",
                selectable && !rail && "group-hover:border-ink",
              )}
            >
              {step.status === "done" ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "whitespace-nowrap",
                !rail && "label-eyebrow",
                !rail && step.status === "upcoming" && "text-ink/30",
                selectable && "group-hover:text-ink",
              )}
            >
              {step.label}
            </span>
          </>
        );

        return (
          <li
            key={step.label}
            aria-current={step.status === "current" ? "step" : undefined}
            className={
              rail ? undefined : "flex flex-1 items-center last:flex-none"
            }
          >
            {selectable ? (
              <button
                type="button"
                onClick={() => onStepSelect(i + 1)}
                aria-label={`Go back to ${step.label}`}
                className={cn(
                  "group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  itemClass,
                  rail && "hover:bg-warm-neutral",
                )}
              >
                {content}
              </button>
            ) : (
              <div className={itemClass}>{content}</div>
            )}
            {!rail && i < steps.length - 1 && (
              <span
                className={cn(
                  "mx-2 h-px flex-1",
                  step.status === "done" ? "bg-lime" : "bg-ink/15",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  ),
);
Stepper.displayName = "Stepper";

export { Stepper };
