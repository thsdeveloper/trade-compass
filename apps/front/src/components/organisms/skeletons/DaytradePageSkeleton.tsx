import { PageShell } from "@/components/organisms/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardSkeleton } from "@/components/atoms/skeletons";
import { DataTableSkeleton } from "@/components/molecules/skeletons";

export function DaytradePageSkeleton() {
  return (
    <PageShell>
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-48 w-full rounded" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-48 w-full rounded" />
          </div>
        </div>

        {/* Table */}
        <DataTableSkeleton columns={8} rows={10} />
      </div>
    </PageShell>
  );
}
