import { Skeleton } from "@/components/ui/skeleton";

/**
 * Streamed while /dashboard/petitions renders. Mirrors the MyItemsPage
 * frame (max-w-[1200px], px-4 py-8, eyebrow/title/CTA header, status
 * filter pills) and the MyPetitionsList grid so nothing jumps when
 * content lands.
 */
export default function DashboardPetitionsLoading() {
  return (
    <section
      className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading your petitions"
    >
      {/* Header row (eyebrow + title + lead, Start a petition button) */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="mt-2 h-9 w-56 max-w-full rounded-lg" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full rounded-full" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl sm:w-48" />
      </div>

      {/* Status filter pills */}
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-8 rounded-full"
            style={{ width: 96 + (i % 3) * 28 }}
          />
        ))}
      </div>

      {/* Petition cards */}
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-hairline bg-surface"
          >
            <div className="aspect-[2.15/1] w-full bg-cream-muted" />
            <div className="space-y-3 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-4/5 rounded-md" />
              <Skeleton className="h-4 w-2/5 rounded-full" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-9 flex-1 rounded-lg" />
                <Skeleton className="h-9 flex-1 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
