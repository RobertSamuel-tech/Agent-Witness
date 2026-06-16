"use client";

import { truncateMessage } from "@/lib/utils";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html className="dark">
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="mx-auto w-full max-w-2xl rounded-lg border border-destructive/30 bg-background p-8">
            <h1 className="text-2xl font-semibold text-foreground">Critical System Error</h1>
            <p className="mt-4 break-words text-sm text-muted-foreground">{truncateMessage(error.message)}</p>
            {error.digest ? (
              <p className="mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-md bg-destructive/20 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-destructive/30"
              >
                Retry
              </button>
              <a
                href="/dashboard"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Return to Dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
