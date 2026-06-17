import { NextRequest, NextResponse } from "next/server";
import { getActionsWithAgentName } from "@/lib/db/queries";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  try {
    const actions = await getActionsWithAgentName(tenantId, 50);
    return NextResponse.json({ actions });
  } catch (error) {
    console.error("GET /api/audit-log failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
