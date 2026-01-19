import { PageShell } from '@/components/organisms/PageShell';
import { Skeleton } from '@/components/ui/skeleton';

export function ReportsSkeleton() {
  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="mt-1 h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        {/* Report Tabs */}
        <div className="rounded-lg border border-slate-200 bg-white p-1">
          <div className="flex gap-1 overflow-x-auto">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-32 flex-shrink-0 rounded-md" />
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-7 w-32" />
              <Skeleton className="mt-1 h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Main Chart Area */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <Skeleton className="mb-4 h-5 w-48" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>

        {/* Secondary Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <Skeleton className="mb-4 h-5 w-36" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <Skeleton className="mb-4 h-5 w-36" />
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
