import { Skeleton } from "@/components/ui/skeleton";

interface TableRowSkeletonProps {
  columns: number;
}

export function TableRowSkeleton({ columns }: TableRowSkeletonProps) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}
