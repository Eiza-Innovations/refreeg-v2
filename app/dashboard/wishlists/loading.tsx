import { Skeleton } from "@/components/ui/skeleton";

export default function WishlistsLoading() {
  return (
    <section
      className="px-4 pb-20 pt-4 sm:px-6 lg:px-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading your wishlists"
    >
      <div className="flex flex-col gap-5 border-b border-hairline pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-md bg-surface" />
            <Skeleton className="h-3.5 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-9 w-56 max-w-full rounded-lg" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full rounded-full" />
        </div>
        <Skeleton className="h-11 w-full rounded-lg sm:w-44" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-hairline bg-surface p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-full" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-4 w-4/5 rounded-full" />
            <Skeleton className="mt-2 h-2 w-full rounded-full bg-bone" />
            <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4">
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="h-3 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
