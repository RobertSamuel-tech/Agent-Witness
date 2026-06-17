import { Skeleton } from "@/components/ui/skeleton";

export default function AgentDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg bg-muted" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48 bg-muted" />
          <Skeleton className="h-3.5 w-64 bg-muted" />
        </div>
      </div>
      <Skeleton className="h-44 rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      <Skeleton className="h-52 rounded-xl bg-muted" />
    </div>
  );
}
