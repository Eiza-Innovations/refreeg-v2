import { Skeleton } from "@/components/ui/skeleton";

export function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 bg-ink/[0.08]" />
        <Skeleton className="h-4 w-80 bg-ink/[0.08]" />
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[97px] rounded-2xl bg-ink/[0.08]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.78fr_1fr]">
        <Skeleton className="h-[300px] rounded-2xl bg-ink/[0.08]" />
        <Skeleton className="h-[300px] rounded-2xl bg-ink/[0.08]" />
      </div>
      <Skeleton className="h-[260px] rounded-2xl bg-ink/[0.08]" />
    </div>
  );
}
