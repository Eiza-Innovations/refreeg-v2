"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toneClasses } from "./tone";
import type { Tone } from "./types";

export function Chip({
  children,
  tone = "green",
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "gap-1.5 whitespace-nowrap border-0 px-2 py-1 text-xs font-semibold leading-none",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </Badge>
  );
}
