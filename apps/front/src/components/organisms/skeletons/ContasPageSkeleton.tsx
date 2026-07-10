import { PageShell } from "@/components/organisms/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export function ContasPageSkeleton() {
  return (
    <PageShell>
      <div className="space-y-6">
        {/* Total Balance Card */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-10 w-48" />
          <Skeleton className="mt-2 h-3 w-32" />
        </div>

        {/* Accounts Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
              <div className="mt-4 border-t border-slate-100 pt-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-1 h-6 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
