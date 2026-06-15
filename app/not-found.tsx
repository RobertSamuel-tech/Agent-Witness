import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-950 p-8 text-center">
        <SearchX className="mx-auto h-12 w-12 text-slate-500" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-50">Page Not Found</h1>
        <p className="mt-2 text-sm text-slate-400">
          Error 404 — the page you requested does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
