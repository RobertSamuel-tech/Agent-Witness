import { Skeleton } from "@/components/ui/skeleton";

export default function LiveLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 bg-muted" />
        <Skeleton className="h-4 w-96 bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl bg-muted" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl bg-muted" />
    </div>
  );
}
