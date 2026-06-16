import { NextRequest, NextResponse } from "next/server";
import { getControlStatus } from "@/lib/db/emergency-controls";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getTenantId(request: NextRequest): string | null {
  const id = request.headers.get("x-tenant-id");
  if (!id || !UUID_PATTERN.test(id)) return null;
  return id;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  try {
    const status = await getControlStatus(tenantId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("GET /api/control/status failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
