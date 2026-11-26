import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyticsPeriodOptions } from "@/lib/options/campaign-analytics.options";
import type { Period } from "./types";

export function PeriodSwitch({
  period,
  onChange,
  disabled,
}: {
  period: Period;
  onChange: (period: Period) => void;
  disabled?: boolean;
}) {
  return (
    <Tabs value={period} onValueChange={(value) => onChange(value as Period)}>
      <TabsList variant="pill" aria-label="Reporting period">
        {analyticsPeriodOptions.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            variant="pill"
            disabled={disabled}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
