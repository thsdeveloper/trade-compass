import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <div className="mt-2">
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="mt-1 h-3 w-20" />
    </div>
  );
}
