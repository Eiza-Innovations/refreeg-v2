import { Small, Span } from "@/components/marketing/Typography";
import { formatCount } from "@/lib/campaign-analytics/format";
import { funnelStepOptions } from "@/lib/options/campaign-analytics.options";
import { cn } from "@/lib/utils";
import type { FunnelStepRow } from "@/types/campaign-analytics-types";
import { optionLabel } from "@/lib/options/option-label";

const barTones = [
  "bg-blue-accent",
  "bg-blue-accent/85",
  "bg-blue-accent/70",
  "bg-blue-accent/55",
  "bg-blue-accent/40",
];

/** Each step shows conversion from the step before; a loss over half reads as a drop. */
function conversion(current: number, before: number) {
  if (!before) return null;
  const rate = current / before;
  return rate < 0.5
    ? { text: `−${Math.round((1 - rate) * 100)}%`, bad: true }
    : { text: `${Math.round(rate * 100)}%`, bad: false };
}

export function FunnelBars({
  steps,
  compare,
  size = "compact",
}: {
  steps: FunnelStepRow[];
  compare: boolean;
  size?: "compact" | "full";
}) {
  const top = steps[0]?.sessions || 1;

  return (
    <ul className={cn(size === "full" ? "space-y-3" : "space-y-2")}>
      {steps.map((row, index) => {
        const rate =
          index > 0
            ? conversion(row.sessions, steps[index - 1].sessions)
            : null;
        return (
          <li
            key={row.step}
            className="grid grid-cols-[7.5rem_1fr_3.5rem_3rem] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr_4rem_3.5rem]"
          >
            <Span className="truncate text-ink/70">
              {optionLabel(funnelStepOptions, row.step)}
            </Span>
            <span
              className={cn(
                "overflow-hidden rounded-md bg-cream-muted",
                size === "full" ? "h-6" : "h-3",
              )}
            >
              <span
                className={cn("block h-full rounded-md", barTones[index])}
                style={{ width: `${(row.sessions / top) * 100}%` }}
              />
            </span>
            <Span className="font-semibold text-ink">
              {formatCount(row.sessions)}
              {compare && (
                <Small className="block text-[11px] font-normal text-ink/50">
                  was {formatCount(row.previous)}
                </Small>
              )}
            </Span>
            <Small
              className={cn(
                "text-right font-semibold",
                rate?.bad ? "text-rust" : "text-forest",
              )}
            >
              {rate?.text}
            </Small>
          </li>
        );
      })}
    </ul>
  );
}
