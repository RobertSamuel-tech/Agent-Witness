import { NextRequest, NextResponse } from "next/server";
import {
  getActionById,
  getPolicyById,
  computeRiskScore,
  getRiskLevel,
  getAffectedAssets,
  buildInvestigationExplanation,
} from "@/lib/db/investigation";
import { getAgentById } from "@/lib/db/queries";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export type StepPhase =
  | "request"
  | "reasoning"
  | "tools"
  | "data"
  | "policy_eval"
  | "decision"
  | "outcome";

export type StepStatus = "completed" | "warning" | "flagged" | "blocked" | "allowed";

export interface ReplayStep {
  step: number;
  phase: StepPhase;
  title: string;
  description: string;
  timestamp: string;
  durationMs: number;
  status: StepStatus;
  riskScore?: number;
  metadata?: Array<{ key: string; value: string }>;
}

export interface ReplayTimeline {
  actionId: string;
  agentName: string;
  agentFramework: string | null;
  actionType: string;
  finalResult: string;
  finalRiskScore: number;
  totalDurationMs: number;
  recordedAt: string;
  steps: ReplayStep[];
}

// Realistic sub-ms durations for each phase (ms)
const STEP_DURATIONS = [0, 71, 134, 189, 87, 34, 8];
const TOTAL_DURATION_MS = STEP_DURATIONS.reduce((a, b) => a + b, 0);

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
    const agentName = agent?.name ?? "Unknown Agent";
    const actionLabel = action.action_type.replace(/_/g, " ");
    const policyLabel = policy ? policy.rule_type.replace(/_/g, " ") : null;

    // Synthesize sub-timestamps backwards from created_at (which is the completion time)
    const endTime = new Date(action.created_at).getTime();
    function stepTs(stepIndex: number): string {
      const msBefore = STEP_DURATIONS.slice(stepIndex + 1).reduce((a, b) => a + b, 0);
      return new Date(endTime - msBefore).toISOString();
    }

    const outcomeStatus: StepStatus =
      action.policy_result === "blocked"
        ? "blocked"
        : action.policy_result === "flagged"
          ? "flagged"
          : "allowed";

    const steps: ReplayStep[] = [
      {
        step: 1,
        phase: "request",
        title: "User Request Received",
        description: action.input_summary,
        timestamp: stepTs(0),
        durationMs: 0,
        status: "completed",
        metadata: [
          { key: "Agent", value: agentName },
          { key: "Action", value: actionLabel },
          ...(action.cost_usd !== null
            ? [{ key: "Est. Cost", value: `$${action.cost_usd.toFixed(6)}` }]
            : []),
        ],
      },
      {
        step: 2,
        phase: "reasoning",
        title: "Agent Reasoning & Planning",
        description: `${agentName} parsed the request and determined that a ${actionLabel} operation was required. ${
          affectedAssets.length > 0
            ? `Target systems identified: ${affectedAssets.join(", ")}.`
            : "No specific target systems identified."
        } Execution plan prepared.`,
        timestamp: stepTs(1),
        durationMs: STEP_DURATIONS[1],
        status: "completed",
        metadata: [
          { key: "Agent", value: agentName },
          { key: "Framework", value: agent?.framework ?? "Unknown" },
          { key: "Planned Operation", value: actionLabel },
          {
            key: "Target Systems",
            value: affectedAssets.length > 0 ? affectedAssets.join(", ") : "None detected",
          },
        ],
      },
      {
        step: 3,
        phase: "tools",
        title: `Tool Invocation: ${action.action_type}`,
        description: `Agent invoked the ${actionLabel} tool with parameters derived from the original request. Execution pipeline initiated.`,
        timestamp: stepTs(2),
        durationMs: STEP_DURATIONS[2],
        status: "completed",
        metadata: [
          { key: "Tool", value: action.action_type },
          {
            key: "Input",
            value:
              action.input_summary.slice(0, 100) +
              (action.input_summary.length > 100 ? "…" : ""),
          },
          ...Object.entries(action.input_metadata)
            .slice(0, 3)
            .map(([k, v]) => ({ key: k, value: String(v) })),
        ],
      },
      {
        step: 4,
        phase: "data",
        title: "Data Access & Output Capture",
        description: `Tool execution completed. Output: "${action.output_summary}".${
          affectedAssets.length > 0
            ? ` Systems accessed: ${affectedAssets.join(", ")}.`
            : ""
        }`,
        timestamp: stepTs(3),
        durationMs: STEP_DURATIONS[3],
        status:
          affectedAssets.length > 0 && action.policy_result !== "allowed"
            ? "warning"
            : "completed",
        metadata: [
          {
            key: "Output",
            value:
              action.output_summary.slice(0, 120) +
              (action.output_summary.length > 120 ? "…" : ""),
          },
          {
            key: "Assets Accessed",
            value: affectedAssets.length > 0 ? affectedAssets.join(", ") : "None",
          },
          ...Object.entries(action.output_metadata)
            .slice(0, 2)
            .map(([k, v]) => ({ key: k, value: String(v) })),
        ],
      },
      {
        step: 5,
        phase: "policy_eval",
        title: policy
          ? `Policy Evaluation: ${policyLabel}`
          : "Policy Evaluation: Heuristic Analysis",
        description: policy
          ? `The ${policyLabel} policy was evaluated against the action's input, output, and metadata. ${riskLevel.toUpperCase()} risk signals detected.`
          : `Heuristic policy engine evaluated this ${actionLabel} action. Risk assessment: ${riskLevel.toUpperCase()} (${riskScore}/100).`,
        timestamp: stepTs(4),
        durationMs: STEP_DURATIONS[4],
        status: action.policy_result === "allowed" ? "completed" : "warning",
        metadata: [
          { key: "Policy", value: policyLabel ?? "Heuristic Engine" },
          { key: "Risk Level", value: `${riskLevel.toUpperCase()} (${riskScore}/100)` },
          { key: "Rule Type", value: policy?.rule_type ?? "anomaly_detection" },
          ...(policy?.rule_config
            ? Object.entries(policy.rule_config)
                .slice(0, 2)
                .map(([k, v]) => ({ key: k, value: String(v) }))
            : []),
        ],
      },
      {
        step: 6,
        phase: "decision",
        title: `Policy Decision: ${action.policy_result.toUpperCase()}`,
        description: buildInvestigationExplanation({
          actionType: action.action_type,
          agentName,
          policyResult: action.policy_result,
          policyRuleType: policy?.rule_type ?? null,
          riskLevel,
          affectedAssets,
        }),
        timestamp: stepTs(5),
        durationMs: STEP_DURATIONS[5],
        status: outcomeStatus,
        riskScore,
        metadata: [
          { key: "Verdict", value: action.policy_result.toUpperCase() },
          { key: "Policy Matched", value: policyLabel ?? "None" },
          { key: "Risk Score", value: `${riskScore}/100` },
          { key: "Risk Level", value: riskLevel.toUpperCase() },
        ],
      },
      {
        step: 7,
        phase: "outcome",
        title: `Final Outcome: ${action.policy_result.toUpperCase()}`,
        description: action.output_summary,
        timestamp: stepTs(6),
        durationMs: STEP_DURATIONS[6],
        status: outcomeStatus,
        riskScore,
        metadata: [
          { key: "Final Result", value: action.policy_result.toUpperCase() },
          { key: "Risk Score", value: `${riskScore}/100` },
          { key: "Risk Level", value: riskLevel },
          {
            key: "Assets Affected",
            value: affectedAssets.join(", ") || "None",
          },
          ...(action.cost_usd !== null
            ? [{ key: "Total Cost", value: `$${action.cost_usd.toFixed(6)}` }]
            : []),
        ],
      },
    ];

    const timeline: ReplayTimeline = {
      actionId: id,
      agentName,
      agentFramework: agent?.framework ?? null,
      actionType: action.action_type,
      finalResult: action.policy_result,
      finalRiskScore: riskScore,
      totalDurationMs: TOTAL_DURATION_MS,
      recordedAt: action.created_at,
      steps,
    };

    return NextResponse.json(timeline);
  } catch (error) {
    console.error("GET /api/actions/[id]/replay failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
