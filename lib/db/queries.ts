import {
  executeSql,
  textParam,
  uuidParam,
  intParam,
  boolParam,
  jsonParam,
  decimalParam,
  vectorParam,
  getString,
  getNullableString,
  getNumber,
  getNullableNumber,
  getBoolean,
  getJsonObject,
  getNullableNumberArray,
  type DbRecord,
} from "./index";
import { setTenantContext } from "./rls";
import type {
  Agent,
  Policy,
  AgentAction,
  PlanType,
  AgentStatus,
  PolicyRuleType,
  PolicyResult,
  TenantSummary,
} from "./types";

export interface AgentActionWithSimilarity extends AgentAction {
  similarity: number;
  agentName: string;
}

// --- Row mappers ---------------------------------------------------------------

function toAgent(row: DbRecord): Agent {
  return {
    id: getString(row, "id"),
    tenant_id: getString(row, "tenant_id"),
    name: getString(row, "name"),
    framework: getNullableString(row, "framework"),
    status: getString(row, "status") as AgentStatus,
    created_at: getString(row, "created_at"),
  };
}

export function toPolicy(row: DbRecord): Policy {
  return {
    id: getString(row, "id"),
    tenant_id: getString(row, "tenant_id"),
    rule_type: getString(row, "rule_type") as PolicyRuleType,
    rule_config: getJsonObject(row, "rule_config"),
    is_active: getBoolean(row, "is_active"),
    created_at: getString(row, "created_at"),
  };
}

export function toAgentAction(row: DbRecord): AgentAction {
  return {
    id: getString(row, "id"),
    tenant_id: getString(row, "tenant_id"),
    agent_id: getString(row, "agent_id"),
    action_type: getString(row, "action_type"),
    input_summary: getString(row, "input_summary"),
    input_metadata: getJsonObject(row, "input_metadata"),
    output_summary: getString(row, "output_summary"),
    output_metadata: getJsonObject(row, "output_metadata"),
    policy_id: getNullableString(row, "policy_id"),
    policy_result: getString(row, "policy_result") as PolicyResult,
    cost_usd: getNullableNumber(row, "cost_usd"),
    embedding: getNullableNumberArray(row, "embedding"),
    created_at: getString(row, "created_at"),
  };
}

function toAgentActionWithSimilarity(row: DbRecord): AgentActionWithSimilarity {
  return {
    ...toAgentAction(row),
    similarity: getNumber(row, "similarity"),
    agentName: getString(row, "agent_name"),
  };
}

// --- Tenants ----------------------------------------------------------------------

export async function getAllTenants(): Promise<TenantSummary[]> {
  const rows = await executeSql(`SELECT id, name, plan FROM tenants ORDER BY created_at ASC`);
  return rows.map((row) => ({
    id: getString(row, "id"),
    name: getString(row, "name"),
    plan: getString(row, "plan") as PlanType,
  }));
}

// --- Agents -------------------------------------------------------------------------

export async function getAgentById(tenantId: string, agentId: string): Promise<Agent | null> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT * FROM agents WHERE tenant_id = :tenantId AND id = :agentId`,
    [uuidParam("tenantId", tenantId), uuidParam("agentId", agentId)]
  );
  return rows.length > 0 ? toAgent(rows[0]) : null;
}

// --- Policies -----------------------------------------------------------------------

export async function getPoliciesByTenant(tenantId: string, activeOnly = false): Promise<Policy[]> {
  await setTenantContext(tenantId);

  const sql = activeOnly
    ? `SELECT * FROM policies WHERE tenant_id = :tenantId AND is_active = true ORDER BY created_at DESC`
    : `SELECT * FROM policies WHERE tenant_id = :tenantId ORDER BY created_at DESC`;

  const rows = await executeSql(sql, [uuidParam("tenantId", tenantId)]);
  return rows.map(toPolicy);
}

export async function insertPolicy(data: Omit<Policy, "id" | "created_at">): Promise<Policy> {
  await setTenantContext(data.tenant_id);

  const rows = await executeSql(
    `INSERT INTO policies (tenant_id, rule_type, rule_config, is_active)
     VALUES (:tenantId, :ruleType, :ruleConfig, :isActive)
     RETURNING *`,
    [
      uuidParam("tenantId", data.tenant_id),
      textParam("ruleType", data.rule_type),
      jsonParam("ruleConfig", data.rule_config),
      boolParam("isActive", data.is_active),
    ]
  );

  if (rows.length === 0) throw new Error("Failed to insert policy");
  return toPolicy(rows[0]);
}

export interface PolicyUpdateInput {
  rule_config?: Record<string, unknown>;
  is_active?: boolean;
}

export async function updatePolicy(
  id: string,
  tenantId: string,
  data: PolicyUpdateInput
): Promise<Policy | null> {
  await setTenantContext(tenantId);

  const parameters = [uuidParam("id", id), uuidParam("tenantId", tenantId)];
  const setClauses: string[] = [];

  if (data.rule_config !== undefined) {
    setClauses.push("rule_config = :ruleConfig");
    parameters.push(jsonParam("ruleConfig", data.rule_config));
  }
  if (data.is_active !== undefined) {
    setClauses.push("is_active = :isActive");
    parameters.push(boolParam("isActive", data.is_active));
  }

  if (setClauses.length === 0) {
    const rows = await executeSql(
      `SELECT * FROM policies WHERE id = :id AND tenant_id = :tenantId`,
      parameters
    );
    return rows.length > 0 ? toPolicy(rows[0]) : null;
  }

  const rows = await executeSql(
    `UPDATE policies SET ${setClauses.join(", ")}
     WHERE id = :id AND tenant_id = :tenantId
     RETURNING *`,
    parameters
  );
  return rows.length > 0 ? toPolicy(rows[0]) : null;
}

export async function deletePolicy(id: string, tenantId: string): Promise<boolean> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `DELETE FROM policies WHERE id = :id AND tenant_id = :tenantId RETURNING id`,
    [uuidParam("id", id), uuidParam("tenantId", tenantId)]
  );
  return rows.length > 0;
}

// --- Agent actions ------------------------------------------------------------------

export interface AgentActionWithAgentName extends AgentAction {
  agentName: string;
}

export async function getActionsWithAgentName(
  tenantId: string,
  limit = 100
): Promise<AgentActionWithAgentName[]> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT aa.*, ag.name AS agent_name
     FROM agent_actions aa
     JOIN agents ag ON ag.id = aa.agent_id
     WHERE aa.tenant_id = :tenantId
     ORDER BY aa.created_at DESC
     LIMIT :limit`,
    [uuidParam("tenantId", tenantId), intParam("limit", limit)]
  );
  return rows.map((row) => ({
    ...toAgentAction(row),
    agentName: getString(row, "agent_name"),
  }));
}

export async function insertAgentAction(
  data: Omit<AgentAction, "id" | "created_at">
): Promise<AgentAction> {
  await setTenantContext(data.tenant_id);

  const rows = await executeSql(
    `INSERT INTO agent_actions (
       tenant_id, agent_id, action_type, input_summary, input_metadata,
       output_summary, output_metadata, policy_id, policy_result, cost_usd, embedding
     ) VALUES (
       :tenantId, :agentId, :actionType, :inputSummary, :inputMetadata,
       :outputSummary, :outputMetadata, :policyId, :policyResult, :costUsd, :embedding::vector
     )
     RETURNING *`,
    [
      uuidParam("tenantId", data.tenant_id),
      uuidParam("agentId", data.agent_id),
      textParam("actionType", data.action_type),
      textParam("inputSummary", data.input_summary),
      jsonParam("inputMetadata", data.input_metadata),
      textParam("outputSummary", data.output_summary),
      jsonParam("outputMetadata", data.output_metadata),
      uuidParam("policyId", data.policy_id),
      textParam("policyResult", data.policy_result),
      decimalParam("costUsd", data.cost_usd),
      vectorParam("embedding", data.embedding),
    ]
  );

  if (rows.length === 0) throw new Error("Failed to insert agent action");
  return toAgentAction(rows[0]);
}

// --- Dashboard stats ----------------------------------------------------------------

export interface RecentAction {
  id: string;
  agentName: string;
  actionType: string;
  policyResult: PolicyResult;
  inputSummary: string;
  createdAt: string;
}

export interface DashboardStats {
  totalActions: number;
  blockedCount: number;
  flaggedCount: number;
  allowedCount: number;
  avgCost: number;
  totalCostToday: number;
  activePolicies: number;
  tenantName: string;
  recentActions: RecentAction[];
}

export async function getDashboardStats(tenantId: string): Promise<DashboardStats> {
  await setTenantContext(tenantId);

  const actionStatsRows = await executeSql(
    `SELECT
       COUNT(*) AS total_actions,
       COUNT(*) FILTER (WHERE policy_result = 'blocked') AS blocked_count,
       COUNT(*) FILTER (WHERE policy_result = 'flagged') AS flagged_count,
       COUNT(*) FILTER (WHERE policy_result = 'allowed') AS allowed_count,
       COALESCE(AVG(cost_usd), 0) AS avg_cost,
       COALESCE(SUM(cost_usd) FILTER (WHERE created_at >= CURRENT_DATE), 0) AS total_cost_today
     FROM agent_actions
     WHERE tenant_id = :tenantId`,
    [uuidParam("tenantId", tenantId)]
  );

  const policyRows = await executeSql(
    `SELECT COUNT(*) AS active_policies FROM policies WHERE tenant_id = :tenantId AND is_active = true`,
    [uuidParam("tenantId", tenantId)]
  );

  const tenantRows = await executeSql(`SELECT name FROM tenants WHERE id = :tenantId`, [
    uuidParam("tenantId", tenantId),
  ]);

  const recentRows = await executeSql(
    `SELECT aa.id, aa.action_type, aa.policy_result, aa.input_summary, aa.created_at, ag.name AS agent_name
     FROM agent_actions aa
     JOIN agents ag ON ag.id = aa.agent_id
     WHERE aa.tenant_id = :tenantId
     ORDER BY aa.created_at DESC
     LIMIT 10`,
    [uuidParam("tenantId", tenantId)]
  );

  const statsRow = actionStatsRows[0] ?? {};
  const policyRow = policyRows[0] ?? {};
  const tenantRow = tenantRows[0] ?? null;

  return {
    totalActions: getNumber(statsRow, "total_actions"),
    blockedCount: getNumber(statsRow, "blocked_count"),
    flaggedCount: getNumber(statsRow, "flagged_count"),
    allowedCount: getNumber(statsRow, "allowed_count"),
    avgCost: getNumber(statsRow, "avg_cost"),
    totalCostToday: getNumber(statsRow, "total_cost_today"),
    activePolicies: getNumber(policyRow, "active_policies"),
    tenantName: tenantRow ? getString(tenantRow, "name") : "",
    recentActions: recentRows.map((row) => ({
      id: getString(row, "id"),
      agentName: getString(row, "agent_name"),
      actionType: getString(row, "action_type"),
      policyResult: getString(row, "policy_result") as PolicyResult,
      inputSummary: getString(row, "input_summary"),
      createdAt: getString(row, "created_at"),
    })),
  };
}

export async function searchSimilarActions(
  tenantId: string,
  embedding: number[],
  limit: number
): Promise<AgentActionWithSimilarity[]> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT aa.id, aa.tenant_id, aa.agent_id, ag.name AS agent_name,
            aa.action_type, aa.input_summary, aa.input_metadata,
            aa.output_summary, aa.output_metadata, aa.policy_id, aa.policy_result,
            aa.cost_usd, aa.created_at,
            1 - (aa.embedding <=> :embedding::vector) AS similarity
     FROM agent_actions aa
     JOIN agents ag ON ag.id = aa.agent_id
     WHERE aa.tenant_id = :tenantId AND aa.embedding IS NOT NULL
     ORDER BY aa.embedding <=> :embedding::vector
     LIMIT :limit`,
    [uuidParam("tenantId", tenantId), vectorParam("embedding", embedding), intParam("limit", limit)]
  );
  return rows.map(toAgentActionWithSimilarity);
}
