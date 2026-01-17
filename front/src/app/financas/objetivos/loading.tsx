import { PageShell } from '@/components/organisms/PageShell';

export default function Loading() {
  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        </div>

        {/* Summary cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>

        {/* Filter tabs skeleton */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-8 w-20 animate-pulse rounded bg-slate-200"
            />
          ))}
        </div>

        {/* Goals grid skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200" />
                  <div className="space-y-2">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 w-full animate-pulse rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
