import { Skeleton } from "@/components/ui/skeleton";

export default function GraphLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72 bg-muted" />
        <Skeleton className="h-4 w-96 bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-[560px] rounded-xl bg-muted lg:col-span-1" />
        <Skeleton className="h-[560px] rounded-xl bg-muted lg:col-span-2" />
      </div>
    </div>
  );
}
