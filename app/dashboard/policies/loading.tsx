import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_CARD_COUNT = 3;

export default function PoliciesLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 bg-muted" />
          <Skeleton className="h-4 w-56 bg-muted" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-48 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
