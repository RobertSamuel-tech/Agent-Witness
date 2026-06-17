import { NextRequest, NextResponse } from "next/server";
import { getAllRecentEvents } from "@/lib/dynamodb";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json(
      { error: "Missing or invalid x-tenant-id header" },
      { status: 400 }
    );
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(200, Math.max(1, parseInt(limitParam ?? "50", 10) || 50));

  try {
    const all = await getAllRecentEvents(limit * 4);
    // Filter to the requesting tenant and honour the limit.
    const events = all.filter((e) => e.tenantId === tenantId).slice(0, limit);
    return NextResponse.json({ events });
  } catch (error) {
    console.error("GET /api/events failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
