import { NextRequest, NextResponse } from "next/server";
import { getAgentById } from "@/lib/db/queries";
import {
  getActionById,
  getPolicyById,
  computeRiskScore,
  getRiskLevel,
  getAffectedAssets,
  buildInvestigationExplanation,
  getSimilarIncidents,
} from "@/lib/db/investigation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid action id" }, { status: 400 });
  }

  try {
    const action = await getActionById(tenantId, id);
    if (!action) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    const [agent, policy] = await Promise.all([
      getAgentById(tenantId, action.agent_id),
      action.policy_id ? getPolicyById(tenantId, action.policy_id) : Promise.resolve(null),
    ]);

    const riskScore = computeRiskScore(action);
    const riskLevel = getRiskLevel(riskScore);
    const affectedAssets = getAffectedAssets(action);

    const aiExplanation = buildInvestigationExplanation({
      actionType: action.action_type,
      agentName: agent?.name ?? "Unknown agent",
      policyResult: action.policy_result,
      policyRuleType: policy?.rule_type ?? null,
      riskLevel,
      affectedAssets,
    });

    const similarIncidents = await getSimilarIncidents(tenantId, action);

    return NextResponse.json({
      action,
      agent,
      policy,
      riskScore,
      riskLevel,
      affectedAssets,
      aiExplanation,
      similarIncidents,
    });
  } catch (error) {
    console.error("GET /api/actions/[id]/investigate failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
