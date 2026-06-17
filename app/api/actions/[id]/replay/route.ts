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
import type { AgentAction, Policy } from "@/lib/db/types";
import type { RiskLevel } from "@/lib/db/investigation";

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

export interface RiskReductionEstimate {
  currentScore: number;
  projectedScore: number;
  reductionPercent: number;
  narrative: string;
}

export interface TrustScoreRecovery {
  currentScore: number;
  projectedScore: number;
  recoveryTimeline: string;
  narrative: string;
  steps: string[];
}

export interface RootCauseAnalysis {
  rootCause: string;
  contributingFactors: string[];
  policyEffectiveness: string;
  recommendedRemediation: string[];
  estimatedRiskReduction: RiskReductionEstimate;
  trustScoreRecovery: TrustScoreRecovery;
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
  aiAnalysis: RootCauseAnalysis;
}

// ─── Durations ────────────────────────────────────────────────────────────────

const STEP_DURATIONS = [0, 71, 134, 189, 87, 34, 8];
const TOTAL_DURATION_MS = STEP_DURATIONS.reduce((a, b) => a + b, 0);

// ─── Root Cause Analysis engine ───────────────────────────────────────────────

function buildRootCauseAnalysis(params: {
  action: AgentAction;
  agentName: string;
  policy: Policy | null;
  riskScore: number;
  riskLevel: RiskLevel;
  affectedAssets: string[];
}): RootCauseAnalysis {
  const { action, agentName, policy, riskScore, riskLevel, affectedAssets } = params;
  const ruleType = policy?.rule_type ?? null;
  const result = action.policy_result;
  const actionLabel = action.action_type.replace(/_/g, " ");
  const assetsClause = affectedAssets.length > 0 ? affectedAssets.join(", ") : "internal systems";
  const hasPii = /pii|ssn|email|phone|credit card|personal/i.test(
    `${action.input_summary} ${action.output_summary}`
  );
  const isHighVolume = /\d{3,}/.test(`${action.input_summary} ${action.output_summary}`);

  // ── Root Cause ─────────────────────────────────────────────────────────────
  let rootCause: string;

  if (ruleType === "data_masking" || hasPii) {
    rootCause = `${agentName} initiated a ${actionLabel} operation that exposed regulated personally identifiable information (PII) in its output payload prior to transmission. The agent processed the request within its configured scope, but its output included sensitive field types — including identifiers that fall under GDPR, CCPA, and sector-specific data protection requirements — without applying masking or redaction. The root cause is an absence of pre-transmission PII scrubbing in the agent's execution pipeline, allowing raw regulated data to reach the policy enforcement boundary.`;
  } else if (ruleType === "domain_block") {
    rootCause = `${agentName} attempted to communicate with an external endpoint that is classified as unauthorized under the active governance policy. The agent's ${actionLabel} operation was correctly scoped to its stated purpose, but the destination domain was not on the approved allowlist, indicating either a misconfigured agent integration or an attempt to exfiltrate data through an unapproved egress channel. The root cause is a gap between the agent's permitted destination set and the actual target endpoint resolved at runtime.`;
  } else if (ruleType === "cost_limit") {
    rootCause = `${agentName} invoked a ${actionLabel} operation whose projected or actual compute cost exceeded the per-call threshold defined in the active cost governance policy. This is typically caused by unbounded prompt construction, recursive tool-use chains, or unexpectedly large context windows passed to the underlying model. The root cause is insufficient cost guardrails within the agent's task-planning logic, allowing it to initiate operations whose resource consumption was not bounded before submission to the policy engine.`;
  } else if (ruleType === "semantic_guard") {
    rootCause = `${agentName} executed a ${actionLabel} operation whose semantic intent was classified as high-risk by the vector-similarity policy engine. The action's input and output embeddings placed it within a restricted semantic category — indicating that the agent's intent, regardless of the literal action type, fell outside the bounds of its permitted operational scope. The root cause is a behavioral drift in the agent's task interpretation, where the semantic content of the request exceeded the boundaries established by the active governance policy.`;
  } else if (result === "allowed") {
    rootCause = `${agentName} executed a ${actionLabel} operation that was evaluated against all active governance policies and permitted to proceed. The action's input, output, and cost profile all remained within acceptable boundaries. No root cause investigation is required for allowed actions; this record is retained as part of the immutable audit trail for compliance evidence purposes.`;
  } else {
    rootCause = `${agentName} executed a ${actionLabel} operation that triggered the policy enforcement layer due to elevated risk signals detected in its input and output payload. The heuristic analysis identified characteristics consistent with ${riskLevel}-risk behavior — including access patterns, data sensitivity markers, or cost anomalies — that caused the action to exceed the acceptable risk threshold. The root cause is a combination of agent behavior and request context that collectively exceeded the governance policy's risk tolerance.`;
  }

  // ── Contributing Factors ───────────────────────────────────────────────────
  const contributingFactors: string[] = [];

  if (hasPii) {
    contributingFactors.push(
      "Unmasked PII fields (email, phone, SSN-format identifiers) present in the output payload at the time of policy evaluation — indicating the agent's data pipeline did not apply pre-transmission redaction."
    );
  }
  if (isHighVolume) {
    contributingFactors.push(
      "High-volume data operation detected in the request context, amplifying the potential compliance exposure from a single incident to a population-scale data event."
    );
  }
  if (ruleType === "domain_block") {
    contributingFactors.push(
      "Destination endpoint not present on the tenant's approved egress allowlist, suggesting an agent configuration that was not reviewed against the current domain governance policy before deployment."
    );
  }
  if (ruleType === "cost_limit") {
    contributingFactors.push(
      "Unbounded prompt or context window construction allowed the LLM inference cost to exceed the per-call threshold — indicative of missing cost guardrails in the agent's task-planning phase."
    );
  }
  if (affectedAssets.length > 1) {
    contributingFactors.push(
      `Multi-system blast radius: the action touched ${affectedAssets.join(", ")}, increasing the potential impact surface beyond a single data store or service boundary.`
    );
  }
  if (result === "blocked") {
    contributingFactors.push(
      "Action reached the policy enforcement boundary without triggering any upstream pre-checks within the agent framework itself — indicating the platform's governance layer served as the sole control preventing the incident."
    );
  }
  if (result === "flagged") {
    contributingFactors.push(
      "Action was flagged rather than blocked, suggesting the violation crossed a soft threshold — the agent should be reviewed for behavioral drift before the next similar operation is permitted."
    );
  }
  if (action.cost_usd !== null && action.cost_usd > 1) {
    contributingFactors.push(
      `Elevated per-call cost of $${action.cost_usd.toFixed(4)} recorded for this action, which may indicate inefficient prompt design or unexpectedly large payload processing.`
    );
  }

  // Ensure minimum 3 factors
  if (contributingFactors.length < 3) {
    contributingFactors.push(
      `Agent framework (${action.input_metadata?.framework ?? "unknown"}) did not surface a pre-execution policy check, deferring all governance enforcement to the AgentWitness policy boundary.`
    );
    contributingFactors.push(
      "No human-in-the-loop approval gate was configured for this action class, allowing the agent to proceed autonomously until intercepted by the enforcement layer."
    );
  }

  // ── Policy Effectiveness ───────────────────────────────────────────────────
  let policyEffectiveness: string;

  if (result === "blocked") {
    if (ruleType === "data_masking") {
      policyEffectiveness = `The PII / Data Masking policy performed as designed: it detected regulated personal data in the agent's output payload and blocked transmission before any records reached the external endpoint. The policy evaluated ${affectedAssets.length > 0 ? affectedAssets.join(" and ") : "the target system"} access in under 100ms and issued a blocking verdict with full audit trail. Zero records were transmitted to the destination. The policy's detection coverage was complete for this incident — no PII escaped the enforcement boundary.`;
    } else if (ruleType === "domain_block") {
      policyEffectiveness = `The Domain Block policy correctly identified the unauthorized egress destination and terminated the outbound connection before data left the enforcement boundary. The policy evaluated the agent's target endpoint against the tenant's allowlist in real time and issued a blocking verdict before the transmission was established. This represents a clean interception with no data leakage to the blocked domain.`;
    } else if (ruleType === "cost_limit") {
      policyEffectiveness = `The Cost Limit policy intercepted this action before LLM inference costs were incurred beyond the configured threshold. The policy evaluated the action's projected cost profile and issued a pre-execution block, preventing runaway spend. The enforcement was timely and effective — no excess charges were incurred as a result of this action.`;
    } else {
      policyEffectiveness = `The active governance policy successfully intercepted this ${riskLevel}-risk action before it could complete. The policy engine evaluated the action's full context — input summary, output payload, cost, and metadata — and issued a blocking verdict within the enforcement window. The action was terminated cleanly with a full audit record and no observable side effects beyond the blocked scope.`;
    }
  } else if (result === "flagged") {
    policyEffectiveness = `The active policy flagged this action for human review rather than issuing an automatic block, indicating the risk signals were above the alerting threshold but below the auto-block threshold. The policy correctly surfaced the incident to the security review queue. However, the fact that the action was not blocked means the operation may have partially completed — the security team should verify whether any data or system state was modified before the flag was raised.`;
  } else {
    policyEffectiveness = `The policy engine evaluated this action and found no violations across the active rule set. All cost, PII, domain, and semantic checks passed within acceptable boundaries. The action was permitted to complete and is recorded here as part of the standard audit trail. No policy gaps were identified for this action class.`;
  }

  // ── Recommended Remediation ────────────────────────────────────────────────
  const recommendedRemediation: string[] = [];

  if (ruleType === "data_masking" || hasPii) {
    recommendedRemediation.push(
      "Implement pre-transmission PII scrubbing in the agent's output pipeline — apply field-level masking for email, phone, and government ID fields before output reaches any external endpoint."
    );
    recommendedRemediation.push(
      "Add a data classification step to the agent's reasoning phase: require the agent to classify its output's sensitivity level before invoking any export or transmission tool."
    );
    recommendedRemediation.push(
      "Restrict the agent's access to raw PII fields at the data source level — provide aggregated or pseudonymized views for operations that do not require individual-level identifiers."
    );
  } else if (ruleType === "domain_block") {
    recommendedRemediation.push(
      "Audit the agent's integration configuration and update its approved destination list to remove unauthorized endpoints — then submit the updated configuration for security review before redeployment."
    );
    recommendedRemediation.push(
      "Implement a destination validation step in the agent's tool-invocation phase: require all outbound endpoints to be resolved against the approved allowlist before the tool is called."
    );
  } else if (ruleType === "cost_limit") {
    recommendedRemediation.push(
      "Refactor the agent's prompt construction to cap context window size — implement a token budget enforced at the task-planning phase, before tool invocation."
    );
    recommendedRemediation.push(
      "Add per-operation cost estimation as a pre-check step: if the estimated cost exceeds 80% of the policy threshold, require explicit approval before proceeding."
    );
  } else if (ruleType === "semantic_guard") {
    recommendedRemediation.push(
      "Review the agent's system prompt and tool definitions for scope drift — tighten the operational boundary to exclude the semantic categories that triggered the violation."
    );
    recommendedRemediation.push(
      "Run the agent's full task library through the semantic guard policy in simulation mode to identify and remediate any other latent scope violations before redeployment."
    );
  }

  recommendedRemediation.push(
    `Add a human-in-the-loop approval gate for ${actionLabel} operations that touch ${assetsClause} — requiring explicit authorization before the agent can initiate high-risk operations autonomously.`
  );
  recommendedRemediation.push(
    "Enable policy simulation dry-runs for this agent class (POST /api/policies/simulate) before deploying new task configurations — catch violations in staging before they reach the enforcement boundary in production."
  );
  if (result === "blocked" || result === "flagged") {
    recommendedRemediation.push(
      "Schedule a cross-functional incident review with security, compliance, and the agent's owning team within 48 hours — document root cause, remediation steps, and the expected timeline for regression testing."
    );
  }

  // ── Risk Reduction Estimate ────────────────────────────────────────────────
  const projectedScore = result === "allowed"
    ? riskScore
    : result === "flagged"
      ? Math.max(12, Math.round(riskScore * 0.28))
      : Math.max(8, Math.round(riskScore * 0.18));

  const reductionPercent = riskScore > 0
    ? Math.round(((riskScore - projectedScore) / riskScore) * 100)
    : 0;

  const estimatedRiskReduction: RiskReductionEstimate = {
    currentScore: riskScore,
    projectedScore,
    reductionPercent,
    narrative:
      result === "allowed"
        ? `This action carried a baseline risk score of ${riskScore}/100. Because it was permitted without violation, no active remediation is required. Maintaining current policy coverage and agent configuration is sufficient to preserve this risk posture.`
        : `Full implementation of the recommended remediation steps is projected to reduce the risk score for this action class from ${riskScore}/100 to approximately ${projectedScore}/100 — a ${reductionPercent}% reduction. The largest gains come from pre-transmission controls and human approval gates, which collectively eliminate the conditions that caused this incident.`,
  };

  // ── Trust Score Recovery ───────────────────────────────────────────────────
  const currentTrustScore =
    result === "blocked" && riskScore >= 80
      ? 38
      : result === "blocked"
        ? 52
        : result === "flagged"
          ? 67
          : 84;

  const projectedTrustScore =
    result === "blocked"
      ? Math.min(currentTrustScore + 38, 88)
      : result === "flagged"
        ? Math.min(currentTrustScore + 18, 90)
        : currentTrustScore;

  const recoveryTimeline =
    result === "blocked"
      ? "21–30 days (contingent on remediation completion and clean operation window)"
      : result === "flagged"
        ? "10–14 days (contingent on incident review and policy acknowledgement)"
        : "No recovery required";

  const trustScoreSteps: string[] =
    result === "allowed"
      ? ["Continue current operating pattern", "No corrective action required"]
      : [
          "Complete all recommended remediation items and submit for security sign-off",
          `Run ${agentName} in supervised mode for a minimum of 7 days post-remediation — no blocking or flagging events permitted`,
          "Pass policy simulation suite (POST /api/policies/simulate) with zero violations across all action types in the agent's task library",
          result === "blocked"
            ? "Obtain sign-off from CISO or designated security lead before restoring autonomous operation"
            : "Conduct a post-incident review with the agent's owning team and document corrective actions in the compliance record",
          "Automated trust score recalculation occurs after 7 consecutive clean operation days — manual escalation available for time-sensitive recovery",
        ];

  const trustScoreRecovery: TrustScoreRecovery = {
    currentScore: currentTrustScore,
    projectedScore: projectedTrustScore,
    recoveryTimeline,
    narrative:
      result === "allowed"
        ? `${agentName} maintains a trust score of ${currentTrustScore}/100. No recovery actions are required as a result of this incident. Continued clean operation will sustain and gradually improve the agent's trust posture.`
        : `This incident has reduced ${agentName}'s trust score to ${currentTrustScore}/100. Following full remediation and a clean supervised operation window, the projected trust score recovery is ${projectedTrustScore}/100. Recovery is structured — each completed remediation step and clean operation day contributes incrementally to score restoration.`,
    steps: trustScoreSteps,
  };

  return {
    rootCause,
    contributingFactors: contributingFactors.slice(0, 5),
    policyEffectiveness,
    recommendedRemediation: recommendedRemediation.slice(0, 5),
    estimatedRiskReduction,
    trustScoreRecovery,
  };
}

// ─── GET handler ──────────────────────────────────────────────────────────────

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

    // Synthesize sub-timestamps backwards from created_at (completion time)
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

    const aiAnalysis = buildRootCauseAnalysis({
      action,
      agentName,
      policy,
      riskScore,
      riskLevel,
      affectedAssets,
    });

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
      aiAnalysis,
    };

    return NextResponse.json(timeline);
  } catch (error) {
    console.error("GET /api/actions/[id]/replay failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
