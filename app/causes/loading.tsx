import { DiscoverCardSkeleton } from "@/components/discover/discover-card";

/**
 * Streamed while /causes renders (covers the Discover grid). Keeps the
 * AppShell chrome mounted and mirrors the real page layout — same
 * max-w-[1440px] container, the 188px filter rail, heading block, sort
 * row and tabs — so the click feels instant and nothing jumps when the
 * content arrives.
 */
export default function CausesLoading() {
  return (
    <div
      className="w-full bg-cream"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[188px_minmax(0,1fr)] xl:gap-14">
          {/* Filter rail (matches DiscoverFilterRail position) */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-3 pt-2">
              <div className="h-3.5 w-20 animate-pulse rounded-full bg-cream-muted" />
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 animate-pulse rounded-full bg-cream-muted"
                  style={{ width: `${88 - (i % 4) * 12}%` }}
                />
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            {/* Heading block */}
            <div className="space-y-2">
              <div className="h-10 w-72 max-w-full animate-pulse rounded-lg bg-cream-muted sm:h-10" />
              <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-cream-muted" />
            </div>

            {/* Controls row (mobile filters, sort, view toggle) */}
            <div className="mt-6 flex items-center justify-between gap-2">
              <div className="h-8 w-36 animate-pulse rounded-full bg-cream-muted" />
              <div className="flex shrink-0 items-center gap-2">
                <div className="h-9 w-28 animate-pulse rounded-lg bg-cream-muted" />
                <div className="h-9 w-9 animate-pulse rounded-lg bg-cream-muted" />
              </div>
            </div>

            {/* Tabs row */}
            <div className="mt-4 flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 animate-pulse rounded-full bg-cream-muted"
                  style={{ width: 88 + i * 24 }}
                />
              ))}
            </div>

            {/* Card grid (same columns and gap as DiscoverGrid) */}
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <DiscoverCardSkeleton
                  key={i}
                  tone={i % 3 === 1 ? "sand" : "surface"}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
