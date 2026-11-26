"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Option } from "@/types/options";

export function PartnerCategoryPicker({
  options,
  selected,
  onChange,
  disabled,
}: {
  options: readonly Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const toggle = (value: string) => {
    if (disabled) return;
    const exists = selected.includes(value);
    onChange(
      exists ? selected.filter((item) => item !== value) : [...selected, value],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <Button
            key={opt.value}
            type="button"
            variant="bare"
            size="bare"
            disabled={disabled}
            onClick={() => toggle(opt.value)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-ink bg-ink text-ink-foreground"
                : "border-hairline bg-surface text-ink/70 hover:bg-bone hover:text-ink",
            )}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
