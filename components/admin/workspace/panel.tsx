"use client";

import type { ReactNode } from "react";
import { Heading } from "@/components/marketing/Typography";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  title,
  aside,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <Card
      variant="surface"
      className={cn("min-w-0 rounded-2xl border-0 p-5 shadow-none", className)}
    >
      {title && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <Heading
            as="h2"
            className="font-montserrat text-sm font-semibold leading-normal tracking-tight md:text-sm"
          >
            {title}
          </Heading>
          {aside}
        </div>
      )}
      {children}
    </Card>
  );
}
