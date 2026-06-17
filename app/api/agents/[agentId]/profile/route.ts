import { NextRequest, NextResponse } from "next/server";
import {
  getAgentTrustDetail,
  getAgentViolationBreakdown,
  getAgentLastIncident,
} from "@/lib/db/trust-scores";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ agentId: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json(
      { error: "Missing or invalid x-tenant-id header" },
      { status: 400 }
    );
  }

  const { agentId } = await context.params;
  if (!UUID_PATTERN.test(agentId)) {
    return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });
  }

  try {
    const [detail, violations, lastIncident] = await Promise.all([
      getAgentTrustDetail(tenantId, agentId),
      getAgentViolationBreakdown(tenantId, agentId),
      getAgentLastIncident(tenantId, agentId),
    ]);

    if (!detail) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...detail,
      violations,
      lastIncidentAt: lastIncident?.timestamp ?? null,
      lastIncidentActionType: lastIncident?.actionType ?? null,
    });
  } catch (error) {
    console.error("GET /api/agents/[agentId]/profile failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
