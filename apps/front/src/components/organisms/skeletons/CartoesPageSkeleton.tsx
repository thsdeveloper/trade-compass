import { PageShell } from "@/components/organisms/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export function CartoesPageSkeleton() {
  return (
    <PageShell>
      <div className="space-y-6">
        {/* Summary Bar */}
        <div className="flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex-1 min-w-[150px]">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1 h-6 w-28" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1 h-6 w-28" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1 h-6 w-28" />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-1 h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-6 w-6 rounded" />
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="mt-1 h-2 w-full rounded-full" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
