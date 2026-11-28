"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TabEmptyStateProps {
  title: string;
  description: string;
  cta: string;
  href: string;
}

export function TabEmptyState({
  title,
  description,
  cta,
  href,
}: TabEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-hairline bg-bone px-5 py-14 text-center">
      <h3 className="font-fraunces text-xl font-medium text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/70">
        {description}
      </p>
      <Button variant="ink" className="mt-6 h-11 rounded-lg px-5" asChild>
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
