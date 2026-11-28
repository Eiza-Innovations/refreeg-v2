/**
 * Streamed while /petitions renders. Mirrors the real page: the same
 * max-w-[1440px] container, the Eyebrow/heading/lead block, the filter
 * pill row, and the grid geometry (gap-5, sm:2, lg:3 with ~280px cards)
 * used by PetitionsList's own Suspense fallback.
 */
export default function PetitionsLoading() {
  return (
    <div
      className="w-full bg-cream"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Heading block */}
        <div className="space-y-2 pt-2">
          <div className="h-3.5 w-20 animate-pulse rounded-full bg-cream-muted" />
          <div className="h-9 w-64 max-w-full animate-pulse rounded-lg bg-cream-muted" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-cream-muted" />
        </div>

        {/* Filter pills (PetitionsFilter position) */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-full bg-surface"
              style={{ width: 92 + (i % 3) * 30 }}
            />
          ))}
        </div>

        {/* Petition cards (same grid as the page's Suspense fallback) */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-[280px] w-full animate-pulse rounded-2xl bg-surface"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
