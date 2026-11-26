import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Small, Span } from "@/components/marketing/Typography";
import { formatNairaShort } from "@/lib/causes/discover-summary";
import { takedownFundOptions } from "@/lib/options/campaign-analytics.options";
import { cn } from "@/lib/utils";
import type { TakedownCampaignInput } from "@/lib/schemas/campaign-analytics.schema";

export function TakedownFundsField({
  value,
  onChange,
  donors,
  raised,
}: {
  value: TakedownCampaignInput["funds"];
  onChange: (value: TakedownCampaignInput["funds"]) => void;
  donors: number;
  raised: number;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as TakedownCampaignInput["funds"])}
      aria-label="What happens to the money"
    >
      {takedownFundOptions.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
            value === option.value
              ? "border-blue-accent bg-blue-accent/5"
              : "border-hairline bg-surface",
          )}
        >
          <RadioGroupItem value={option.value} className="mt-0.5" />
          <span className="space-y-0.5">
            <Span className="block text-sm font-semibold text-ink">
              {option.label}
              {option.value === "refund" &&
                ` · ${donors} donor${donors === 1 ? "" : "s"}, ${formatNairaShort(raised)}`}
            </Span>
            <Small className="block text-ink/60">{option.hint}</Small>
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}
