import { Skeleton } from "@/components/ui/skeleton";

export default function ReplayLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg bg-muted" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48 bg-muted" />
          <Skeleton className="h-3.5 w-72 bg-muted" />
        </div>
      </div>
      <Skeleton className="h-40 rounded-xl bg-muted" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-muted" />
            <Skeleton className="h-28 flex-1 rounded-xl bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
