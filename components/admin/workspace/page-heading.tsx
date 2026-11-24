"use client";

import type { ReactNode } from "react";
import { Heading, P } from "@/components/marketing/Typography";

/** Serif page title with its one-line subtitle, shared by Overview and Analytics. */
export function PageHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: ReactNode;
}) {
  return (
    <div>
      <Heading as="h1" size="subsection" className="tracking-tight md:text-3xl">
        {title}
      </Heading>
      <P className="mt-2 text-sm text-ink/60 md:text-sm">{subtitle}</P>
    </div>
  );
}
