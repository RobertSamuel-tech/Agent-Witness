import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_KPI_COUNT = 6;

export default function RiskCenterLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 bg-muted" />
        <Skeleton className="h-4 w-96 bg-muted" />
      </div>
      <Skeleton className="h-40 rounded-xl bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: SKELETON_KPI_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
