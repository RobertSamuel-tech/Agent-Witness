import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-border bg-card p-8 text-center">
        <SearchX className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Page Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Error 404 — the page you requested does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
