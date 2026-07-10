import { PageShell } from "@/components/organisms/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoriasPageSkeleton() {
  return (
    <PageShell>
      <div className="space-y-6">
        {/* Categories Grid - 2 columns */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Expenses Column */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div>
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-1 h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-5 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Income Column */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div>
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-1 h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-5 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
