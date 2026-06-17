import { NextRequest, NextResponse } from "next/server";
import { getAgentTrustScores } from "@/lib/db/trust-scores";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json(
      { error: "Missing or invalid x-tenant-id header" },
      { status: 400 }
    );
  }

  try {
    const agents = await getAgentTrustScores(tenantId);
    return NextResponse.json({ agents });
  } catch (error) {
    console.error("GET /api/agents/trust failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
