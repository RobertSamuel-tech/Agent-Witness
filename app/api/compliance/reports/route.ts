import { NextRequest, NextResponse } from "next/server";
import { listComplianceReports } from "@/lib/db/compliance-reports";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json(
      { error: "Missing or invalid x-tenant-id header" },
      { status: 400 }
    );
  }

  try {
    const reports = await listComplianceReports(tenantId);
    return NextResponse.json({ reports });
  } catch (error) {
    console.error("GET /api/compliance/reports failed", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance reports" },
      { status: 500 }
    );
  }
}
