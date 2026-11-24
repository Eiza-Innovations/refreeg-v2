"use client";

import { useEffect, useRef, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { Command } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useDiscoverSearch } from "@/hooks/use-discover-search";
import { DiscoverSearchResults } from "./discover-search-results";

export function DiscoverSearch({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useDiscoverSearch({
    onNavigate: () => setOpen(false),
  });

  // ⌘K / Ctrl+K opens and focuses the panel from anywhere on the page.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) requestAnimationFrame(() => inputRef.current?.focus());
          return !prev;
        });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close when a pointer press or focus move lands outside the combobox.
  // Scoped to `open` so the listeners only exist while the panel is up.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      onKeyDown={(e) => {
        // Escape closes the panel but keeps the typed query, matching
        // popover conventions (re-focus or re-click reopens it).
        if (e.key === "Escape") setOpen(false);
      }}
      className={cn("relative", compact ? "w-52 xl:w-72" : "w-full max-w-md")}
    >
      <Command shouldFilter={false} className="overflow-visible bg-transparent">
        <div className="flex h-[42px] items-center gap-2 rounded-full border border-hairline bg-white px-3 transition-colors focus-within:border-ink/25">
          <SearchIcon className="h-[18px] w-[18px] shrink-0 stroke-[1.75] text-ink/60" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label="Search campaigns, petitions and NGOs"
            title="Search (Ctrl/⌘ K)"
            placeholder="Search campaigns, petitions, organisations…"
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            className="min-w-0 flex-1 truncate bg-transparent text-sm text-ink outline-none placeholder:text-ink/55"
          />
          {search.query ? (
            <button
              type="button"
              aria-label="Clear search"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
              onMouseDown={(e) => {
                // Keep focus in the input while clearing so the user can
                // refine immediately.
                e.preventDefault();
                search.setQuery("");
                inputRef.current?.focus();
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            !compact && (
              <kbd className="hidden h-[26px] shrink-0 items-center rounded-full bg-ink/[0.06] px-2.5 font-sans text-[11px] font-medium text-ink/60 sm:inline-flex">
                ⌘K
              </kbd>
            )
          )}
        </div>

        {open && search.query.trim() && (
          <div
            className={cn(
              "absolute top-full z-50 mt-2 rounded-2xl border border-hairline bg-white shadow-subtle",
              compact
                ? // Header trigger is narrow; grow the panel leftwards from
                  // the right edge so it never overflows the viewport.
                  "right-0 w-[min(calc(100vw-2rem),26rem)]"
                : "left-0 w-full min-w-[16rem]",
            )}
          >
            <DiscoverSearchResults
              search={search}
              hideInput
              listClassName="max-h-[min(60vh,420px)]"
            />
          </div>
        )}
      </Command>
    </div>
  );
}
