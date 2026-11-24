"use client";

import { Small, Strong } from "@/components/marketing/Typography";
import { cn } from "@/lib/utils";
import { toneClasses } from "./tone";
import type { Tone } from "./types";

export function Person({
  name,
  detail,
  initials,
  tone = "neutral",
}: {
  name: string;
  detail?: string;
  initials: string;
  tone?: Tone;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-ink",
          toneClasses[tone],
        )}
      >
        {initials}
      </span>
      <div className="min-w-0">
        <Strong className="block truncate text-sm leading-tight">{name}</Strong>
        {detail && (
          <Small className="mt-0.5 block truncate leading-tight">
            {detail}
          </Small>
        )}
      </div>
    </div>
  );
}
