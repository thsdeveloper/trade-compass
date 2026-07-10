import { PageShell } from '@/components/organisms/PageShell';

export default function Loading() {
  return (
    <PageShell>
      <div className="space-y-6">
        {/* Summary Cards Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="h-3 w-20 rounded bg-slate-200" />
              <div className="mt-2 h-8 w-32 rounded bg-slate-200" />
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-64 animate-pulse rounded-md bg-slate-200" />
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-8 w-20 animate-pulse rounded-md bg-slate-200"
              />
            ))}
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="mt-1 h-3 w-24 rounded bg-slate-200" />
                </div>
                <div className="h-5 w-12 rounded-full bg-slate-200" />
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-slate-200" />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="h-3 w-16 rounded bg-slate-200" />
                  <div className="mt-1 h-5 w-24 rounded bg-slate-200" />
                </div>
                <div>
                  <div className="h-3 w-16 rounded bg-slate-200" />
                  <div className="mt-1 h-5 w-24 rounded bg-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
