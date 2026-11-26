import { Badge, type BadgeProps } from "@/components/ui/badge";
import { riskSuggestionOptions } from "@/lib/options/campaign-analytics.options";
import type { RiskSuggestion } from "@/types/campaign-analytics-types";

const variants: Record<RiskSuggestion, BadgeProps["variant"]> = {
  "take-down": "critical",
  freeze: "critical",
  review: "gold",
  watch: "held",
};

export function RiskSuggestionBadge({
  suggestion,
}: {
  suggestion: RiskSuggestion;
}) {
  return (
    <Badge variant={variants[suggestion]} className="gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {
        riskSuggestionOptions.find((option) => option.value === suggestion)
          ?.label
      }
    </Badge>
  );
}
