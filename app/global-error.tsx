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
      <body className="bg-slate-950 text-slate-50">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="mx-auto w-full max-w-2xl rounded-lg border border-red-900/50 bg-slate-950 p-8">
            <h1 className="text-2xl font-semibold text-slate-50">Critical System Error</h1>
            <p className="mt-4 break-words text-sm text-slate-400">{truncateMessage(error.message)}</p>
            {error.digest ? (
              <p className="mt-2 text-xs text-slate-500">Reference: {error.digest}</p>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-md bg-red-900/50 px-4 py-2 text-sm font-medium text-slate-50 transition-colors hover:bg-red-900/70"
              >
                Retry
              </button>
              <a
                href="/dashboard"
                className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
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
