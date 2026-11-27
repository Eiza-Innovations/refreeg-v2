import { Check } from "lucide-react";
import { Span } from "@/components/marketing/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { InterestCardProps } from "@/types/onboarding-types";

/** A selectable tile for one thing people can fund, with how many campaigns are in it. */
export function InterestCard({
  label,
  icon: Icon,
  count,
  countsLoaded,
  selected,
  onToggle,
}: InterestCardProps) {
  let detail = null;
  if (!countsLoaded) {
    detail = <Skeleton className="h-3.5 w-16" />;
  } else if (count != null) {
    detail = count === 1 ? "1 campaign" : `${count} campaigns`;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors",
        selected
          ? "border-ink bg-ink text-ink-foreground"
          : "border-hairline bg-surface text-ink hover:border-ink/40",
      )}
    >
      <div className="flex w-full items-center justify-between">
        {Icon ? (
          <Icon className={cn("h-5 w-5", selected && "text-lime")} />
        ) : null}
        {selected ? <Check className="h-4 w-4" /> : null}
      </div>
      <Span className="text-sm font-medium">{label}</Span>
      <div
        className={cn(
          "font-montserrat text-xs",
          selected ? "text-ink-foreground/70" : "text-ink/50",
        )}
      >
        {detail}
      </div>
    </button>
  );
}
