"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page padding and scoped admin tokens around every admin workspace screen. */
export function WorkspaceFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("admin-workspace px-4 py-8 text-ink sm:px-8", className)}
    >
      {children}
    </div>
  );
}
