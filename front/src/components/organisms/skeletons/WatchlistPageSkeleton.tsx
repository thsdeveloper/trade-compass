import { PageShell } from "@/components/organisms/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export function WatchlistPageSkeleton() {
  return (
    <PageShell>
      <div className="space-y-6">
        {/* Watchlist Cards */}
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-1 items-center gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="mt-1 h-3 w-32" />
                  </div>
                </div>
                <div className="hidden flex-wrap gap-2 md:flex">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <Skeleton key={j} className="h-6 w-24 rounded-full" />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
