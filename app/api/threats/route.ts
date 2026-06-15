import { NextRequest, NextResponse } from "next/server";
import { getThreatTimeline, getThreatMetrics } from "@/lib/db/threat-timeline";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  try {
    const [incidents, metrics] = await Promise.all([
      getThreatTimeline(tenantId),
      getThreatMetrics(tenantId),
    ]);

    return NextResponse.json({ metrics, incidents });
  } catch (error) {
    console.error("GET /api/threats failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
