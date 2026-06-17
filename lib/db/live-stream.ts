import {
  executeSql,
  uuidParam,
  intParam,
  textParam,
  getString,
  getNullableString,
  getNullableNumber,
  type DbRecord,
} from "./index";
import { setTenantContext } from "./rls";
import type { PolicyResult } from "./types";

export interface LiveEvent {
  id: string;
  agentName: string;
  actionType: string;
  policyResult: PolicyResult;
  inputSummary: string;
  createdAt: string;
  costUsd: number | null;
  policyRuleType: string | null;
}

function toLiveEvent(row: DbRecord): LiveEvent {
  return {
    id: getString(row, "id"),
    agentName: getString(row, "agent_name"),
    actionType: getString(row, "action_type"),
    policyResult: getString(row, "policy_result") as PolicyResult,
    inputSummary: getString(row, "input_summary"),
    createdAt: getString(row, "created_at"),
    costUsd: getNullableNumber(row, "cost_usd"),
    policyRuleType: getNullableString(row, "rule_type"),
  };
}

export async function getRecentLiveEvents(tenantId: string, limit = 20): Promise<LiveEvent[]> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT aa.id, ag.name AS agent_name, aa.action_type, aa.policy_result,
            aa.input_summary, aa.created_at, aa.cost_usd, p.rule_type
     FROM agent_actions aa
     JOIN agents ag ON ag.id = aa.agent_id
     LEFT JOIN policies p ON p.id = aa.policy_id
     WHERE aa.tenant_id = :tenantId
     ORDER BY aa.created_at DESC
     LIMIT :limit`,
    [uuidParam("tenantId", tenantId), intParam("limit", limit)]
  );

  return rows.map(toLiveEvent);
}

export async function getLiveEventsSince(tenantId: string, since: string): Promise<LiveEvent[]> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT aa.id, ag.name AS agent_name, aa.action_type, aa.policy_result,
            aa.input_summary, aa.created_at, aa.cost_usd, p.rule_type
     FROM agent_actions aa
     JOIN agents ag ON ag.id = aa.agent_id
     LEFT JOIN policies p ON p.id = aa.policy_id
     WHERE aa.tenant_id = :tenantId AND aa.created_at > :since::timestamptz
     ORDER BY aa.created_at DESC`,
    [uuidParam("tenantId", tenantId), textParam("since", since)]
  );

  return rows.map(toLiveEvent);
}

export interface LiveKpis {
  agentsOnline: number;
  actionsLastMinute: number;
  blockedToday: number;
  governanceScore: number;
}

export async function getLiveKpis(tenantId: string): Promise<LiveKpis> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT
       (SELECT COUNT(DISTINCT agent_id)
        FROM agent_actions
        WHERE tenant_id = :tenantId
          AND created_at >= now() - interval '24 hours') AS agents_online,
       (SELECT COUNT(*)
        FROM agent_actions
        WHERE tenant_id = :tenantId
          AND created_at >= now() - interval '1 minute') AS actions_last_minute,
       (SELECT COUNT(*)
        FROM agent_actions
        WHERE tenant_id = :tenantId
          AND policy_result = 'blocked'
          AND created_at >= CURRENT_DATE) AS blocked_today,
       (SELECT COUNT(*) FROM agent_actions WHERE tenant_id = :tenantId)                              AS total_count,
       (SELECT COUNT(*) FROM agent_actions WHERE tenant_id = :tenantId AND policy_result = 'blocked') AS total_blocked,
       (SELECT COUNT(*) FROM agent_actions WHERE tenant_id = :tenantId AND policy_result = 'flagged') AS total_flagged`,
    [uuidParam("tenantId", tenantId)]
  );

  const row = rows[0] ?? {};

  function safeNum(key: string): number {
    const v = row[key];
    if (v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }

  const totalCount  = safeNum("total_count");
  const totalBlocked = safeNum("total_blocked");
  const totalFlagged = safeNum("total_flagged");
  const blockedPct = totalCount > 0 ? totalBlocked / totalCount : 0;
  const flaggedPct  = totalCount > 0 ? totalFlagged  / totalCount : 0;
  const governanceScore = Math.max(0, Math.min(100, Math.round(100 - blockedPct * 100 - flaggedPct * 40)));

  return {
    agentsOnline: safeNum("agents_online"),
    actionsLastMinute: safeNum("actions_last_minute"),
    blockedToday: safeNum("blocked_today"),
    governanceScore,
  };
}
