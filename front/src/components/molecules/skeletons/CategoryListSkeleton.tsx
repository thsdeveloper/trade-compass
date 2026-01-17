import { Skeleton } from "@/components/ui/skeleton";

interface CategoryListSkeletonProps {
  items?: number;
}

export function CategoryListSkeleton({ items = 6 }: CategoryListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="group">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="mt-1.5 h-1 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}
