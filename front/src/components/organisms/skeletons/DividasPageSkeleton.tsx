import { PageShell } from "@/components/organisms/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/molecules/skeletons";
import { StatCardSkeleton } from "@/components/atoms/skeletons";

export function DividasPageSkeleton() {
  return (
    <PageShell>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>

        {/* Table */}
        <DataTableSkeleton columns={6} rows={8} />
      </div>
    </PageShell>
  );
}
