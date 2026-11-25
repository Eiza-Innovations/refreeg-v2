import { RISK_HIGH } from "@/lib/campaign-analytics/risk-levels";
import { cn } from "@/lib/utils";

export function RiskScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="h-1.5 w-28 overflow-hidden rounded-full bg-cream-muted"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Risk score ${score}`}
      >
        <span
          className={cn(
            "block h-full rounded-full",
            score >= RISK_HIGH ? "bg-rust" : "bg-gold",
          )}
          style={{ width: `${score}%` }}
        />
      </span>
      <span className="w-6 text-sm font-semibold text-ink">{score}</span>
    </div>
  );
}
