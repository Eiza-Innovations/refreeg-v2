import { P, Span } from "@/components/marketing/Typography";
import { leaveReasonOptions } from "@/lib/options/campaign-analytics.options";
import { cn } from "@/lib/utils";
import type { LeaveReasonRow } from "@/types/campaign-analytics-types";

const reasonTones: Record<string, string> = {
  card_declined: "bg-rust",
  abandoned: "bg-gold",
  transfer_incomplete: "bg-gold",
  timeout: "bg-ink/30",
};

export function LeaveReasonsList({ reasons }: { reasons: LeaveReasonRow[] }) {
  const failures = reasons.reduce((total, row) => total + row.sessions, 0);
  if (failures === 0) {
    return (
      <P className="text-ink/60 md:text-sm">
        No failed payments in this period.
      </P>
    );
  }

  return (
    <ul className="space-y-3">
      {reasons.map((row) => {
        const share = (row.sessions / failures) * 100;
        return (
          <li
            key={row.reason}
            className="grid grid-cols-[1fr_8rem_2.5rem] items-center gap-3 text-sm"
          >
            <Span className="text-ink/70">
              {leaveReasonOptions.find((option) => option.value === row.reason)
                ?.label ?? row.reason}
            </Span>
            <span className="h-2 overflow-hidden rounded-full bg-cream-muted">
              <span
                className={cn(
                  "block h-full rounded-full",
                  reasonTones[row.reason] ?? "bg-ink/30",
                )}
                style={{ width: `${share}%` }}
              />
            </span>
            <Span className="text-right font-semibold text-ink">
              {Math.round(share)}%
            </Span>
          </li>
        );
      })}
    </ul>
  );
}
