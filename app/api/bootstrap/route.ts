import { NextRequest, NextResponse } from "next/server";
import {
  applySchema,
  getEnvironmentReport,
  seedDefaultTenants,
  type EnvironmentReport,
  type SchemaStatementResult,
  type SeedResult,
} from "@/lib/db/bootstrap";

interface BootstrapPostResponse {
  statements: SchemaStatementResult[];
  seed: SeedResult;
  report: EnvironmentReport;
}

function isAuthorized(request: NextRequest): boolean {
  const expectedToken = process.env.BOOTSTRAP_TOKEN;
  if (!expectedToken) return false;

  const providedToken = request.headers.get("x-bootstrap-token");
  return providedToken === expectedToken;
}

/**
 * Environment readiness report. Read-only — verifies Aurora connectivity,
 * pgvector availability, required tables, RLS + policy coverage, and the
 * HNSW embedding index without modifying schema.
 */
export async function GET(): Promise<NextResponse<EnvironmentReport>> {
  const report = await getEnvironmentReport();
  return NextResponse.json(report, {
    status: report.ready ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Applies the canonical schema (idempotent), seeds default tenants if the
 * tenants table is empty, then returns the resulting environment report.
 * Safe to call repeatedly.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<BootstrapPostResponse | { error: string }>> {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const initialReport = await getEnvironmentReport();

    if (process.env.NODE_ENV === "production" && initialReport.ready) {
      return NextResponse.json(
        { error: "Environment already bootstrapped" },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!initialReport.aurora.connected) {
      return NextResponse.json(
        { statements: [], seed: { seeded: false, insertedCount: 0 }, report: initialReport },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    const statements = await applySchema();
    const seed = await seedDefaultTenants();
    const report = await getEnvironmentReport();

    return NextResponse.json(
      { statements, seed, report },
      { status: report.ready ? 200 : 503, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/bootstrap failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
