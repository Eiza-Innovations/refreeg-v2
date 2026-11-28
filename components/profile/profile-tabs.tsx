"use client";

import type { ProfileTab } from "@/components/profile/profile-types";
import { cn } from "@/lib/utils";

interface ProfileTabsProps {
  tabs: ProfileTab[];
  active: ProfileTab["id"];
  onChange: (id: ProfileTab["id"]) => void;
}

export function ProfileTabs({ tabs, active, onChange }: ProfileTabsProps) {
  return (
    <div className="flex items-center gap-x-1 overflow-x-auto border-b border-hairline [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onChange(entry.id)}
          aria-current={active === entry.id ? "true" : undefined}
          className={cn(
            "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors sm:px-4 sm:py-3 sm:text-sm",
            active === entry.id
              ? "border-ink text-ink"
              : "border-transparent text-ink/50 hover:text-ink/80",
          )}
        >
          {entry.label}
          {entry.count > 0 && (
            <span className="rounded-full bg-bone px-1.5 py-0.5 text-[11px] font-bold text-ink/70 sm:px-2 sm:text-xs">
              {entry.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
