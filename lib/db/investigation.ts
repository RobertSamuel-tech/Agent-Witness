import { executeSql, uuidParam, vectorParam, intParam, getString, getNumber } from "./index";
import { setTenantContext } from "./rls";
import { toAgentAction, toPolicy } from "./queries";
import { embedText } from "../ai/embedder";
import { formatPolicyName } from "./risk-center";
import type { AgentAction, Policy, PolicyResult } from "./types";

export type RiskLevel = "critical" | "high" | "medium" | "low";

export interface SimilarIncident {
  id: string;
  agentName: string;
  actionType: string;
  inputSummary: string;
  similarity: number;
  policyResult: PolicyResult;
  createdAt: string;
}

const RISK_KEYWORDS = ["pii", "ssn", "credit card", "password", "export", "unauthorized"];
const HIGH_COST_THRESHOLD = 5;
const HIGH_COST_BONUS_CAP = 20;
const HIGH_COST_MULTIPLIER = 5;
const KEYWORD_RISK_BONUS = 15;
const MAX_RISK_SCORE = 100;

const ACTION_TYPE_ASSETS: Record<string, string> = {
  data_access: "Database",
  api_call: "External API",
  email_send: "Email System",
  tool_use: "Internal Tool",
};

const METADATA_ASSET_PATTERNS: Array<{ pattern: RegExp; asset: string }> = [
  { pattern: /database|table/, asset: "Database" },
  { pattern: /apiendpoint|api_endpoint|service/, asset: "External API" },
  { pattern: /crm/, asset: "CRM" },
  { pattern: /email/, asset: "Email System" },
];

const SIMILAR_INCIDENT_LIMIT = 3;

/**
 * Fetches a single agent_actions row, scoped to the requesting tenant.
 */
export async function getActionById(tenantId: string, id: string): Promise<AgentAction | null> {
  await setTenantContext(tenantId);

  const rows = await executeSql(`SELECT * FROM agent_actions WHERE id = :id AND tenant_id = :tenantId`, [
    uuidParam("id", id),
    uuidParam("tenantId", tenantId),
  ]);

  return rows.length > 0 ? toAgentAction(rows[0]) : null;
}

/**
 * Fetches a single policy, scoped to the requesting tenant.
 */
export async function getPolicyById(tenantId: string, policyId: string): Promise<Policy | null> {
  await setTenantContext(tenantId);

  const rows = await executeSql(`SELECT * FROM policies WHERE id = :id AND tenant_id = :tenantId`, [
    uuidParam("id", policyId),
    uuidParam("tenantId", tenantId),
  ]);

  return rows.length > 0 ? toPolicy(rows[0]) : null;
}

/**
 * Risk score 0-100. Base score reflects the policy engine's verdict;
 * additional points are added for high-cost actions and for input summaries
 * referencing sensitive-data keywords.
 */
export function computeRiskScore(action: AgentAction): number {
  let score: number;
  switch (action.policy_result) {
    case "blocked":
      score = 95;
      break;
    case "flagged":
      score = 65;
      break;
    case "allowed":
      score = 10;
      break;
  }

  if (action.cost_usd !== null && action.cost_usd > HIGH_COST_THRESHOLD) {
    score += Math.min(Math.floor(action.cost_usd * HIGH_COST_MULTIPLIER), HIGH_COST_BONUS_CAP);
  }

  const lowerInput = action.input_summary.toLowerCase();
  if (RISK_KEYWORDS.some((keyword) => lowerInput.includes(keyword))) {
    score += KEYWORD_RISK_BONUS;
  }

  return Math.min(score, MAX_RISK_SCORE);
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/**
 * Infers which systems an action touched from its action_type, its
 * input/output metadata, and free-text summaries. Deduplicated.
 */
export function getAffectedAssets(action: AgentAction): string[] {
  const assets = new Set<string>();

  const inferredFromType = ACTION_TYPE_ASSETS[action.action_type];
  if (inferredFromType) {
    assets.add(inferredFromType);
  }

  const metadataText = JSON.stringify({
    input: action.input_metadata,
    output: action.output_metadata,
  }).toLowerCase();

  for (const { pattern, asset } of METADATA_ASSET_PATTERNS) {
    if (pattern.test(metadataText)) {
      assets.add(asset);
    }
  }

  const summaryText = `${action.input_summary} ${action.output_summary}`.toLowerCase();
  if (summaryText.includes("crm")) {
    assets.add("CRM");
  }
  if (summaryText.includes("csv") || summaryText.includes("spreadsheet")) {
    assets.add("Data Export");
  }

  return Array.from(assets);
}

/**
 * Deterministic (no LLM) explanation built from the action's own data:
 * action type, agent, policy verdict, the policy type that matched (if any),
 * the computed risk level, and the inferred affected assets.
 */
export function buildInvestigationExplanation(params: {
  actionType: string;
  agentName: string;
  policyResult: PolicyResult;
  policyRuleType: string | null;
  riskLevel: RiskLevel;
  affectedAssets: string[];
}): string {
  const { actionType, agentName, policyResult, policyRuleType, riskLevel, affectedAssets } = params;
  const actionLabel = actionType.replace(/_/g, " ");
  const assetsClause = affectedAssets.length > 0 ? `${affectedAssets.join(" and ")} systems` : "no monitored systems";

  let sentence = `This ${actionLabel} action by ${agentName} was `;

  if (policyResult === "blocked") {
    sentence += policyRuleType
      ? `blocked due to ${formatPolicyName(policyRuleType)} policy evaluation`
      : "blocked by heuristic anomaly detection";
  } else if (policyResult === "flagged") {
    sentence += policyRuleType
      ? `flagged for review under ${formatPolicyName(policyRuleType)} policy evaluation`
      : "flagged for review by heuristic anomaly detection";
  } else {
    sentence += "allowed to proceed by the policy engine";
  }

  sentence += `, creating ${riskLevel} risk exposure to ${assetsClause}.`;

  if (policyResult === "blocked") {
    sentence += " Real-time blocking prevented potential data leakage.";
  } else if (policyResult === "flagged") {
    sentence += " This incident has been queued for human review.";
  } else {
    sentence += " No further action is required at this time.";
  }

  return sentence;
}

/**
 * Finds up to 3 semantically similar past actions via pgvector, excluding
 * the action under investigation. If the action has no embedding (e.g. a
 * blocked action stored with embedding = NULL), one is generated on the fly
 * from its input/output summaries so blocked incidents can still be compared
 * against history.
 */
export async function getSimilarIncidents(tenantId: string, action: AgentAction): Promise<SimilarIncident[]> {
  await setTenantContext(tenantId);

  let embedding = action.embedding;
  if (!embedding && action.policy_result === "blocked") {
    embedding = await embedText(`${action.input_summary} ${action.output_summary}`);
  }
  if (!embedding) {
    return [];
  }

  const rows = await executeSql(
    `SELECT aa.id, ag.name AS agent_name, aa.action_type, aa.input_summary, aa.policy_result, aa.created_at,
            1 - (aa.embedding <=> :embedding::vector) AS similarity
     FROM agent_actions aa
     JOIN agents ag ON ag.id = aa.agent_id
     WHERE aa.tenant_id = :tenantId AND aa.embedding IS NOT NULL AND aa.id <> :excludeId
     ORDER BY aa.embedding <=> :embedding::vector
     LIMIT :limit`,
    [
      uuidParam("tenantId", tenantId),
      vectorParam("embedding", embedding),
      uuidParam("excludeId", action.id),
      intParam("limit", SIMILAR_INCIDENT_LIMIT),
    ]
  );

  return rows.map((row) => ({
    id: getString(row, "id"),
    agentName: getString(row, "agent_name"),
    actionType: getString(row, "action_type"),
    inputSummary: getString(row, "input_summary"),
    similarity: getNumber(row, "similarity"),
    policyResult: getString(row, "policy_result") as PolicyResult,
    createdAt: getString(row, "created_at"),
  }));
}
