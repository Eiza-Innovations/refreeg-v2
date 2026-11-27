import type { ChoiceCardProps } from "@/types/onboarding-types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** A selectable row with an icon, a label and a radio dot, used by the onboarding choices. */
export function ChoiceCard({
  icon: Icon,
  label,
  description,
  active,
  onSelect,
}: ChoiceCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.99 }}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border bg-surface px-4 py-4 text-left transition-colors",
        active
          ? "border-blue-accent bg-blue-accent/10"
          : "border-hairline hover:border-ink/40",
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cream-muted">
        <Icon className="h-5 w-5 text-ink" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink">{label}</span>
        {description && (
          <span className="block text-sm text-ink/60">{description}</span>
        )}
      </span>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          active ? "border-blue-accent" : "border-ink/30",
        )}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-blue-accent" />}
      </span>
    </motion.button>
  );
}
