"use client";

import Link from "next/link";
import { truncateMessage } from "@/lib/utils";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-warning/30 bg-card p-8">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard Error</h1>
        <p className="mt-4 break-words text-sm text-muted-foreground">{truncateMessage(error.message)}</p>
        {error.digest ? (
          <p className="mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-warning/20 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-warning/30"
          >
            Retry
          </button>
          <Link
            href="/dashboard"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
