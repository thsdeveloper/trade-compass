import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TextSkeletonProps {
  width?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
  height?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const widthMap = {
  xs: "w-12",
  sm: "w-20",
  md: "w-32",
  lg: "w-48",
  xl: "w-64",
  full: "w-full",
};

const heightMap = {
  xs: "h-3",
  sm: "h-4",
  md: "h-5",
  lg: "h-6",
};

export function TextSkeleton({
  width = "md",
  height = "sm",
  className,
}: TextSkeletonProps) {
  return (
    <Skeleton
      className={cn(heightMap[height], widthMap[width], className)}
    />
  );
}
