import { NextRequest, NextResponse } from "next/server";
import { getRecentLiveEvents, getLiveEventsSince, getLiveKpis } from "@/lib/db/live-stream";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  const since = request.nextUrl.searchParams.get("since");

  try {
    const [events, kpis] = await Promise.all([
      since ? getLiveEventsSince(tenantId, since) : getRecentLiveEvents(tenantId, 30),
      getLiveKpis(tenantId),
    ]);

    return NextResponse.json(
      { events, kpis, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("GET /api/live-events failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
