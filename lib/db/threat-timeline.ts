import { executeSql, uuidParam, intParam, getString, getNullableString, getNullableNumber, getNumber } from "./index";
import { setTenantContext } from "./rls";
import { formatPolicyName } from "./risk-center";
import type { PolicyResult } from "./types";

export type ThreatSeverity = "CRITICAL" | "HIGH";

export interface TimelineEvent {
  label: string;
  timestamp: string;
}

export interface ThreatIncident {
  incidentId: string;
  timestamp: string;
  severity: ThreatSeverity;
  agentName: string;
  actionType: string;
  policyResult: PolicyResult;
  policyName: string | null;
  costUsd: number | null;
  inputSummary: string;
  outputSummary: string;
  events: TimelineEvent[];
  explanation: string;
}

export interface ThreatMetrics {
  criticalIncidents: number;
  highRiskEvents: number;
  policiesTriggered: number;
  agentsInvolved: number;
}

const INCIDENT_LIMIT = 50;

function formatActionType(actionType: string): string {
  return actionType.replace(/_/g, " ");
}

function severityForResult(policyResult: PolicyResult): ThreatSeverity {
  return policyResult === "blocked" ? "CRITICAL" : "HIGH";
}

/**
 * Reconstructs the investigation timeline for a single blocked/flagged
 * action. Every step is derived from the action's own columns
 * (policy_result, the rule_type of the policy it tripped) — nothing is
 * hardcoded per-incident.
 */
function buildTimelineEvents(params: {
  agentName: string;
  actionType: string;
  policyResult: PolicyResult;
  policyRuleType: string | null;
  timestamp: string;
}): TimelineEvent[] {
  const { agentName, actionType, policyResult, policyRuleType, timestamp } = params;
  const events: TimelineEvent[] = [];
  const push = (label: string) => events.push({ label, timestamp });

  push(`${agentName} initiated ${formatActionType(actionType)}`);
  push("Policy engine evaluated request");

  if (policyResult === "blocked") {
    push("Risk indicators detected");

    switch (policyRuleType) {
      case "data_masking":
        push("Sensitive data pattern detected");
        break;
      case "domain_block":
        push("Blocked destination domain detected");
        break;
      case "cost_limit":
        push("Cost threshold exceeded");
        break;
      default:
        push("Policy violation detected");
    }

    push(`${formatPolicyName(policyRuleType)} policy matched`);
    push("Action blocked");
    push("Incident recorded");
  } else {
    push("Anomalous behavior detected");
    push("Human review recommended");
    push("Incident recorded");
  }

  return events;
}

/**
 * Plain-language explanation generated from the policy type that fired —
 * no LLM call, just a deterministic mapping from rule_type to wording.
 */
function buildExplanation(policyResult: PolicyResult, policyRuleType: string | null): string {
  if (policyResult === "blocked") {
    const policyName = formatPolicyName(policyRuleType);

    let detail: string;
    switch (policyRuleType) {
      case "data_masking":
        detail = "identified sensitive data patterns in the request";
        break;
      case "domain_block":
        detail = "identified a request to a blocked destination domain";
        break;
      case "cost_limit":
        detail = "identified that the action exceeded the configured cost threshold";
        break;
      default:
        detail = "identified a policy violation";
    }

    return `This action was blocked because the request contained indicators matching the ${policyName} policy. The policy engine ${detail} and prevented execution.`;
  }

  return "This action was flagged for human review because it exhibited anomalous behavior relative to this agent's typical activity. No policy blocked execution, but the action was logged for manual investigation.";
}

function toThreatIncident(row: Record<string, unknown>): ThreatIncident {
  const timestamp = getString(row, "created_at");
  const agentName = getString(row, "agent_name");
  const actionType = getString(row, "action_type");
  const policyResult = getString(row, "policy_result") as PolicyResult;
  const policyRuleType = getNullableString(row, "policy_rule_type");

  return {
    incidentId: getString(row, "id"),
    timestamp,
    severity: severityForResult(policyResult),
    agentName,
    actionType,
    policyResult,
    policyName: policyRuleType ? formatPolicyName(policyRuleType) : null,
    costUsd: getNullableNumber(row, "cost_usd"),
    inputSummary: getString(row, "input_summary"),
    outputSummary: getString(row, "output_summary"),
    events: buildTimelineEvents({ agentName, actionType, policyResult, policyRuleType, timestamp }),
    explanation: buildExplanation(policyResult, policyRuleType),
  };
}

/**
 * Reconstructed incident timeline for every blocked/flagged action, newest
 * first.
 */
export async function getThreatTimeline(tenantId: string): Promise<ThreatIncident[]> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT
       aa.id, aa.created_at, aa.action_type, aa.input_summary, aa.output_summary,
       aa.policy_result, aa.cost_usd, ag.name AS agent_name, p.rule_type AS policy_rule_type
     FROM agent_actions aa
     JOIN agents ag ON ag.id = aa.agent_id
     LEFT JOIN policies p ON p.id = aa.policy_id
     WHERE aa.tenant_id = :tenantId AND aa.policy_result IN ('blocked', 'flagged')
     ORDER BY aa.created_at DESC
     LIMIT :limit`,
    [uuidParam("tenantId", tenantId), intParam("limit", INCIDENT_LIMIT)]
  );

  return rows.map(toThreatIncident);
}

/**
 * A single incident by id, scoped to the requesting tenant.
 */
export async function getThreatIncidentById(tenantId: string, id: string): Promise<ThreatIncident | null> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT
       aa.id, aa.created_at, aa.action_type, aa.input_summary, aa.output_summary,
       aa.policy_result, aa.cost_usd, ag.name AS agent_name, p.rule_type AS policy_rule_type
     FROM agent_actions aa
     JOIN agents ag ON ag.id = aa.agent_id
     LEFT JOIN policies p ON p.id = aa.policy_id
     WHERE aa.tenant_id = :tenantId AND aa.id = :id AND aa.policy_result IN ('blocked', 'flagged')`,
    [uuidParam("tenantId", tenantId), uuidParam("id", id)]
  );

  return rows.length > 0 ? toThreatIncident(rows[0]) : null;
}

export async function getThreatMetrics(tenantId: string): Promise<ThreatMetrics> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT
       COUNT(*) FILTER (WHERE aa.policy_result = 'blocked') AS critical_incidents,
       COUNT(*) FILTER (WHERE aa.policy_result = 'flagged') AS high_risk_events,
       COUNT(*) FILTER (WHERE aa.policy_result <> 'allowed' AND aa.policy_id IS NOT NULL) AS policies_triggered,
       COUNT(DISTINCT aa.agent_id) FILTER (WHERE aa.policy_result <> 'allowed') AS agents_involved
     FROM agent_actions aa
     WHERE aa.tenant_id = :tenantId`,
    [uuidParam("tenantId", tenantId)]
  );

  const row = rows[0] ?? {};
  return {
    criticalIncidents: getNumber(row, "critical_incidents"),
    highRiskEvents: getNumber(row, "high_risk_events"),
    policiesTriggered: getNumber(row, "policies_triggered"),
    agentsInvolved: getNumber(row, "agents_involved"),
  };
}
