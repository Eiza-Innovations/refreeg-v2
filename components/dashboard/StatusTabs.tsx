"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Option } from "@/types/options";

type Props = {
  options: readonly Option[];
  status: string;
  basePath: string;
};

export function StatusTabs({ options, status, basePath }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>("[data-state=active]");
    if (!list || !active) return;
    list.scrollTo({
      left: active.offsetLeft - (list.clientWidth - active.clientWidth) / 2,
    });
  }, [status]);

  const selectStatus = (value: string) => {
    if (value === status) return;
    const url = value === "all" ? basePath : `${basePath}?status=${value}`;
    startTransition(() => router.replace(url, { scroll: false }));
  };

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
            onClick={() => selectStatus(option.value)}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
