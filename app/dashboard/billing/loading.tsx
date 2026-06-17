import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-muted" />
        <Skeleton className="h-4 w-96 bg-muted" />
      </div>
      <Skeleton className="h-44 rounded-xl bg-muted" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-xl bg-muted" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl bg-muted" />
    </div>
  );
}
