import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { AuthStepProgressProps } from "@/types/auth-types";

/** "Step 1 of 3" with a thin blue progress bar, shown above the sign-up forms. */
export function AuthStepProgress({
  step,
  total = 3,
  className,
}: AuthStepProgressProps) {
  return (
    <div className={cn("mb-6 flex items-center gap-3", className)}>
      <span className="whitespace-nowrap text-xs font-medium text-ink">
        Step {step} of {total}
      </span>
      <Progress
        value={(step / total) * 100}
        aria-label={`Step ${step} of ${total}`}
        className="h-1 flex-1 bg-warm-neutral"
        indicatorVariant="blue"
      />
    </div>
  );
}
