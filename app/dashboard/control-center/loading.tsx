import { Skeleton } from "@/components/ui/skeleton";

export default function ControlCenterLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52 bg-muted" />
        <Skeleton className="h-4 w-80 bg-muted" />
      </div>
      <Skeleton className="h-40 rounded-xl bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-36 rounded-xl bg-muted" />
        <Skeleton className="h-36 rounded-xl bg-muted" />
      </div>
      <Skeleton className="h-48 rounded-xl bg-muted" />
    </div>
  );
}
