import { PageShell } from '@/components/organisms/PageShell';
import { Skeleton } from '@/components/ui/skeleton';

export function PlanejamentoSkeleton() {
  return (
    <PageShell>
      <div className="space-y-8">
        {/* Month navigation */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
        </div>

        {/* Hero Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Methodology Hero */}
          <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-6">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-72 mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Health Score */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 flex flex-col items-center justify-center">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-6 w-20 mt-4 rounded-full" />
          </div>
        </div>

        {/* Donut Chart */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Skeleton className="h-[250px] w-full md:w-1/2 rounded-lg" />
            <div className="w-full md:w-1/2 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div>
          <Skeleton className="h-5 w-48 mb-4" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-2 w-full rounded-full mb-2" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historical Chart */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
          <Skeleton className="h-[280px] w-full rounded" />
        </div>

        {/* Projections */}
        <div>
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-2 w-full rounded-full mt-3" />
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <Skeleton className="h-5 w-48 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-1" />
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
