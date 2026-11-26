import { Badge, type BadgeProps } from "@/components/ui/badge";
import { formatNairaCompact } from "@/lib/campaign-analytics/format";
import type { VelocityRow } from "@/types/campaign-analytics-types";

const copy: Record<
  VelocityRow["forecast"],
  { variant: BadgeProps["variant"]; label: (row: VelocityRow) => string }
> = {
  "will-hit": { variant: "forest", label: () => "Will hit goal" },
  short: {
    variant: "gold",
    label: (row) => `Short ${formatNairaCompact(row.shortBy)}`,
  },
  stalled: { variant: "critical", label: () => "Stalled" },
  open: { variant: "held", label: () => "No end date" },
};

export function ForecastBadge({ row }: { row: VelocityRow }) {
  const { variant, label } = copy[row.forecast];
  return (
    <Badge variant={variant} className="gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label(row)}
    </Badge>
  );
}
