"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  GIVING_SEARCH_EVENT,
  type GivingSearchDetail,
} from "@/lib/giving/search-event";

const COMMIT_DEBOUNCE_MS = 300;

export function GivingSearch() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const lastPushed = useRef(value);

  const commit = useCallback(
    (raw: string) => {
      const next = raw.trim();
      if (next === lastPushed.current) return;
      lastPushed.current = next;

      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("q", next);
      else params.delete("q");
      params.delete("limit");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
      window.dispatchEvent(
        new CustomEvent<GivingSearchDetail>(GIVING_SEARCH_EVENT, {
          detail: { q: next },
        }),
      );
    },
    [pathname, searchParams],
  );

  useEffect(() => {
    const timeout = setTimeout(() => commit(value), COMMIT_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [value, commit]);

  return (
    <label className="flex w-full max-w-sm items-center gap-2 rounded-full border border-hairline bg-surface px-3.5 py-2 text-sm text-ink/60 transition-colors focus-within:border-ink/40">
      <Search className="h-4 w-4 shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // Enter commits immediately instead of waiting out the debounce.
          if (e.key === "Enter") commit(value);
        }}
        placeholder="Search your giving"
        aria-label="Search your giving"
        className="w-full bg-transparent text-ink outline-none placeholder:text-ink/45"
      />
    </label>
  );
}
