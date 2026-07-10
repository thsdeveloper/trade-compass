import { Skeleton } from "@/components/ui/skeleton";

export function MonthTabsSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      <div className="grid h-9 grid-cols-12 gap-0.5 rounded-lg bg-slate-100/80 p-0.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-full rounded-md bg-slate-200/60" />
        ))}
      </div>
    </div>
  );
}
