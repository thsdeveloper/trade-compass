import { PageShell } from "@/components/organisms/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthTabsSkeleton, DataTableSkeleton } from "@/components/molecules/skeletons";

export function TransacoesPageSkeleton() {
  return (
    <PageShell>
      <div className="space-y-6">
        {/* Month Tabs */}
        <MonthTabsSkeleton />

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>

        {/* Table */}
        <DataTableSkeleton columns={7} rows={10} />
      </div>
    </PageShell>
  );
}
