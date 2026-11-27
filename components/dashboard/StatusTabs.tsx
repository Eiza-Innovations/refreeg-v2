"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Option } from "@/types/options";

type Props = {
  options: readonly Option[];
  status: string;
  /** The section path, such as /dashboard/causes. */
  basePath: string;
};

/** Pill tabs that filter a dashboard list by status through the URL. */
export function StatusTabs({ options, status, basePath }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  // On narrow screens the active pill can sit off to the side; bring it in view.
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>("[data-state=active]");
    if (!list || !active) return;
    list.scrollTo({
      left: active.offsetLeft - (list.clientWidth - active.clientWidth) / 2,
    });
  }, [status]);

  return (
    <Tabs value={status}>
      <TabsList
        ref={listRef}
        variant="pill"
        className="h-auto max-w-full justify-start overflow-x-auto"
      >
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            variant="pill"
            asChild
          >
            <Link
              href={
                option.value === "all"
                  ? basePath
                  : `${basePath}?status=${option.value}`
              }
            >
              {option.label}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
