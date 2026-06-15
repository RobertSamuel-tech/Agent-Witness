import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROW_COUNT = 5;

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        <Skeleton className="h-4 w-64 bg-slate-800" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl bg-slate-800" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40 bg-slate-800" />
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-full bg-slate-800" />
        ))}
      </div>
    </div>
  );
}
