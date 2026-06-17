import { executeSql, uuidParam, getString, getNumber, getNullableString } from "./index";
import { setTenantContext } from "./rls";
import type { PolicyResult } from "./types";

export type GovernanceLevel = "LOW" | "MEDIUM" | "HIGH";

export interface GovernanceScore {
  score: number;
  level: GovernanceLevel;
  blockedCount: number;
  flaggedCount: number;
  highCostCount: number;
}

export interface ExecutiveMetrics {
  totalActions: number;
  blockedActions: number;
  flaggedActions: number;
  policiesActive: number;
  agentsMonitored: number;
  totalAiSpend: number;
}

export interface TopRiskAgent {
  agentName: string;
  riskScore: number;
  blockedCount: number;
  flaggedCount: number;
}

export interface PolicyRiskBreakdownEntry {
  policyName: string;
  hitCount: number;
}

export interface CriticalIncident {
  timestamp: string;
  agentName: string;
  actionType: string;
  inputSummary: string;
  policyName: string;
  policyResult: PolicyResult;
}

const POLICY_RULE_LABELS: Record<string, string> = {
  cost_limit: "Cost Limit",
  data_masking: "Data Masking",
  domain_block: "Domain Block",
};

export function formatPolicyName(ruleType: string | null): string {
  if (!ruleType) return "Unassigned";
  return POLICY_RULE_LABELS[ruleType] ?? ruleType;
}

/**
 * Governance score derived from blocked/flagged/high-cost action counts.
 *
 * score = 100 - (blockedCount * 5) - (flaggedCount * 2) - (highCostCount * 1),
 * clamped to [0, 100]. "High cost" actions are those that triggered a
 * cost_limit policy (rule_type = 'cost_limit') and were not allowed.
 */
export async function getGovernanceMetrics(tenantId: string): Promise<GovernanceScore> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT
       COUNT(*)                                                                              AS total_count,
       COUNT(*) FILTER (WHERE aa.policy_result = 'blocked')                                 AS blocked_count,
       COUNT(*) FILTER (WHERE aa.policy_result = 'flagged')                                 AS flagged_count,
       COUNT(*) FILTER (WHERE p.rule_type = 'cost_limit' AND aa.policy_result <> 'allowed') AS high_cost_count
     FROM agent_actions aa
     LEFT JOIN policies p ON p.id = aa.policy_id
     WHERE aa.tenant_id = :tenantId`,
    [uuidParam("tenantId", tenantId)]
  );

  const row = rows[0] ?? {};
  const totalCount = getNumber(row, "total_count");
  const blockedCount = getNumber(row, "blocked_count");
  const flaggedCount = getNumber(row, "flagged_count");
  const highCostCount = getNumber(row, "high_cost_count");

  const blockedPct = totalCount > 0 ? blockedCount / totalCount : 0;
  const flaggedPct = totalCount > 0 ? flaggedCount / totalCount : 0;
  const rawScore = 100 - blockedPct * 100 - flaggedPct * 40 - (totalCount > 0 ? highCostCount / totalCount * 20 : 0);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let level: GovernanceLevel;
  if (score >= 80) {
    level = "LOW";
  } else if (score >= 50) {
    level = "MEDIUM";
  } else {
    level = "HIGH";
  }

  return { score, level, blockedCount, flaggedCount, highCostCount };
}

export async function getExecutiveMetrics(tenantId: string): Promise<ExecutiveMetrics> {
  await setTenantContext(tenantId);

  const actionRows = await executeSql(
    `SELECT
       COUNT(*) AS total_actions,
       COUNT(*) FILTER (WHERE policy_result = 'blocked') AS blocked_actions,
       COUNT(*) FILTER (WHERE policy_result = 'flagged') AS flagged_actions,
       COALESCE(SUM(cost_usd), 0) AS total_ai_spend
     FROM agent_actions
     WHERE tenant_id = :tenantId`,
    [uuidParam("tenantId", tenantId)]
  );

  const policyRows = await executeSql(
    `SELECT COUNT(*) AS policies_active FROM policies WHERE tenant_id = :tenantId AND is_active = true`,
    [uuidParam("tenantId", tenantId)]
  );

  const agentRows = await executeSql(
    `SELECT COUNT(*) AS agents_monitored FROM agents WHERE tenant_id = :tenantId`,
    [uuidParam("tenantId", tenantId)]
  );

  const actionRow = actionRows[0] ?? {};
  const policyRow = policyRows[0] ?? {};
  const agentRow = agentRows[0] ?? {};

  return {
    totalActions: getNumber(actionRow, "total_actions"),
    blockedActions: getNumber(actionRow, "blocked_actions"),
    flaggedActions: getNumber(actionRow, "flagged_actions"),
    policiesActive: getNumber(policyRow, "policies_active"),
    agentsMonitored: getNumber(agentRow, "agents_monitored"),
    totalAiSpend: getNumber(actionRow, "total_ai_spend"),
  };
}

/**
 * Top 5 agents ranked by riskScore = blockedCount * 3 + flaggedCount.
 */
export async function getTopRiskAgents(tenantId: string): Promise<TopRiskAgent[]> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT
       ag.name AS agent_name,
       COUNT(*) FILTER (WHERE aa.policy_result = 'blocked') AS blocked_count,
       COUNT(*) FILTER (WHERE aa.policy_result = 'flagged') AS flagged_count
     FROM agents ag
     LEFT JOIN agent_actions aa ON aa.agent_id = ag.id AND aa.tenant_id = ag.tenant_id
     WHERE ag.tenant_id = :tenantId
     GROUP BY ag.id, ag.name
     ORDER BY (COUNT(*) FILTER (WHERE aa.policy_result = 'blocked') * 3
               + COUNT(*) FILTER (WHERE aa.policy_result = 'flagged')) DESC
     LIMIT 5`,
    [uuidParam("tenantId", tenantId)]
  );

  return rows.map((row) => {
    const blockedCount = getNumber(row, "blocked_count");
    const flaggedCount = getNumber(row, "flagged_count");
    return {
      agentName: getString(row, "agent_name"),
      riskScore: blockedCount * 3 + flaggedCount,
      blockedCount,
      flaggedCount,
    };
  });
}

/**
 * Aggregates non-"allowed" agent_actions per policy, sorted by hit count.
 */
export async function getPolicyRiskBreakdown(tenantId: string): Promise<PolicyRiskBreakdownEntry[]> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT
       p.rule_type AS rule_type,
       COUNT(aa.id) AS hit_count
     FROM policies p
     LEFT JOIN agent_actions aa
       ON aa.policy_id = p.id AND aa.tenant_id = p.tenant_id AND aa.policy_result <> 'allowed'
     WHERE p.tenant_id = :tenantId
     GROUP BY p.id, p.rule_type
     ORDER BY hit_count DESC, p.rule_type ASC`,
    [uuidParam("tenantId", tenantId)]
  );

  return rows.map((row) => ({
    policyName: formatPolicyName(getString(row, "rule_type")),
    hitCount: getNumber(row, "hit_count"),
  }));
}

/**
 * The 10 most recent blocked actions, newest first.
 */
export async function getRecentCriticalIncidents(tenantId: string): Promise<CriticalIncident[]> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT
       aa.created_at,
       ag.name AS agent_name,
       aa.action_type,
       aa.input_summary,
       p.rule_type AS policy_rule_type,
       aa.policy_result
     FROM agent_actions aa
     JOIN agents ag ON ag.id = aa.agent_id
     LEFT JOIN policies p ON p.id = aa.policy_id
     WHERE aa.tenant_id = :tenantId AND aa.policy_result = 'blocked'
     ORDER BY aa.created_at DESC
     LIMIT 10`,
    [uuidParam("tenantId", tenantId)]
  );

  return rows.map((row) => ({
    timestamp: getString(row, "created_at"),
    agentName: getString(row, "agent_name"),
    actionType: getString(row, "action_type"),
    inputSummary: getString(row, "input_summary"),
    policyName: formatPolicyName(getNullableString(row, "policy_rule_type")),
    policyResult: getString(row, "policy_result") as PolicyResult,
  }));
}

/**
 * Plain-language rollup of the live governance posture, generated entirely
 * from the query results above (no canned text or fixed numbers).
 */
export async function getExecutiveSummary(tenantId: string): Promise<string> {
  const [metrics, governance, topAgents, policyBreakdown] = await Promise.all([
    getExecutiveMetrics(tenantId),
    getGovernanceMetrics(tenantId),
    getTopRiskAgents(tenantId),
    getPolicyRiskBreakdown(tenantId),
  ]);

  const agentClause =
    metrics.agentsMonitored === 1 ? "1 agent" : `${metrics.agentsMonitored} agents`;
  const actionClause =
    metrics.totalActions === 1 ? "1 action" : `${metrics.totalActions} actions`;

  let sentence = `AgentWitness is monitoring ${agentClause} across ${actionClause}.`;

  if (governance.blockedCount > 0) {
    sentence += ` ${governance.blockedCount} action${governance.blockedCount === 1 ? "" : "s"} ${
      governance.blockedCount === 1 ? "was" : "were"
    } blocked.`;
  } else {
    sentence += ` No actions have been blocked.`;
  }

  const topAgent = topAgents.find((agent) => agent.riskScore > 0);
  if (topAgent) {
    sentence += ` The highest-risk agent is ${topAgent.agentName} (risk score ${topAgent.riskScore}).`;
  }

  const topPolicy = policyBreakdown.find((policy) => policy.hitCount > 0);
  if (topPolicy) {
    sentence += ` The most frequently triggered policy is ${topPolicy.policyName} (${topPolicy.hitCount} hit${
      topPolicy.hitCount === 1 ? "" : "s"
    }).`;
  }

  sentence += ` Current governance score is ${governance.score}/100 (${governance.level} risk).`;

  return sentence;
}
