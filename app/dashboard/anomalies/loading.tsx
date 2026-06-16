import { Skeleton } from "@/components/ui/skeleton";

export default function AnomaliesLoading() {
  return (
    <div className="space-y-8">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Skeleton className="h-9 w-96 bg-muted" />
        <Skeleton className="h-4 w-72 bg-muted" />
      </div>
      <div className="mx-auto mb-8 max-w-3xl space-y-3">
        <Skeleton className="h-20 w-full rounded-md bg-muted" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-32 rounded-md bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
