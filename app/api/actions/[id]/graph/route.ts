import { NextRequest, NextResponse } from "next/server";
import { getActionById, getPolicyById, computeRiskScore, getRiskLevel } from "@/lib/db/investigation";
import { getAgentById } from "@/lib/db/queries";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export interface GraphNode {
  id: string;
  type: "agent" | "action" | "policy" | "outcome";
  label: string;
  sublabel?: string;
  status?: "allowed" | "blocked" | "flagged";
  riskScore?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface CausalGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  actionId: string;
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

    const nodes: GraphNode[] = [
      {
        id: "agent",
        type: "agent",
        label: agent?.name ?? "Unknown Agent",
        sublabel: agent?.framework ?? "AI Agent",
      },
      {
        id: "action",
        type: "action",
        label: action.action_type.replace(/_/g, " "),
        sublabel: action.input_summary.slice(0, 60) + (action.input_summary.length > 60 ? "…" : ""),
      },
    ];

    const edges: GraphEdge[] = [
      { id: "e-agent-action", source: "agent", target: "action", label: "initiated" },
    ];

    if (policy) {
      nodes.push({
        id: "policy",
        type: "policy",
        label: policy.rule_type.replace(/_/g, " "),
        sublabel: "Policy Evaluation",
      });
      edges.push({ id: "e-action-policy", source: "action", target: "policy", label: "evaluated by" });

      nodes.push({
        id: "outcome",
        type: "outcome",
        label: action.policy_result.toUpperCase(),
        sublabel: `Risk: ${riskLevel} (${riskScore}/100)`,
        status: action.policy_result,
        riskScore,
      });
      edges.push({ id: "e-policy-outcome", source: "policy", target: "outcome", label: "→" });
    } else {
      nodes.push({
        id: "outcome",
        type: "outcome",
        label: action.policy_result.toUpperCase(),
        sublabel: `Risk: ${riskLevel} (${riskScore}/100)`,
        status: action.policy_result,
        riskScore,
      });
      edges.push({ id: "e-action-outcome", source: "action", target: "outcome", label: "→" });
    }

    const graph: CausalGraph = { nodes, edges, actionId: id };
    return NextResponse.json(graph);
  } catch (error) {
    console.error("GET /api/actions/[id]/graph failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
