import { NextRequest, NextResponse } from "next/server";
import { resumeAgentExecution } from "@/lib/db/emergency-controls";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getTenantId(request: NextRequest): string | null {
  const id = request.headers.get("x-tenant-id");
  if (!id || !UUID_PATTERN.test(id)) return null;
  return id;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  try {
    const control = await resumeAgentExecution(tenantId);
    return NextResponse.json(control);
  } catch (error) {
    console.error("POST /api/control/resume failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
