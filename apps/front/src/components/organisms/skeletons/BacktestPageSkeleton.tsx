import { PageShell } from "@/components/organisms/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardSkeleton } from "@/components/atoms/skeletons";
import { DataTableSkeleton } from "@/components/molecules/skeletons";

export function BacktestPageSkeleton() {
  return (
    <PageShell>
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
        </div>

        {/* Tabs */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-1">
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-md" />
              ))}
            </div>
          </div>

          {/* Summary Tab Content */}
          <div className="p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>

            {/* Chart */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <Skeleton className="mb-4 h-5 w-40" />
              <Skeleton className="h-64 w-full rounded" />
            </div>

            {/* Additional Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-2 h-8 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
