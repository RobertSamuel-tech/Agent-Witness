import {
  executeSql,
  uuidParam,
  getString,
  getNumber,
  getNullableString,
} from "./index";
import { setTenantContext } from "./rls";

// ── Violation breakdown ───────────────────────────────────────────────────────

const POLICY_LABEL: Record<string, string> = {
  domain_block: "Domain Block",
  data_masking: "PII / Data Masking",
  cost_limit: "LLM Cost Limit",
};

export interface ViolationEntry {
  ruleType: string;
  policyName: string;
  blockedCount: number;
  flaggedCount: number;
  lastOccurredAt: string | null;
}

export interface LastIncident {
  timestamp: string;
  actionType: string;
  policyResult: string;
}

export async function getAgentViolationBreakdown(
  tenantId: string,
  agentId: string
): Promise<ViolationEntry[]> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT
       COALESCE(p.rule_type, 'unknown')                           AS rule_type,
       COUNT(*) FILTER (WHERE aa.policy_result = 'blocked')       AS blocked_ct,
       COUNT(*) FILTER (WHERE aa.policy_result = 'flagged')       AS flagged_ct,
       MAX(aa.created_at)                                         AS last_occurred_at
     FROM agent_actions aa
     LEFT JOIN policies p ON p.id = aa.policy_id
     WHERE aa.agent_id   = :agentId
       AND aa.tenant_id  = :tenantId
       AND aa.policy_result <> 'allowed'
     GROUP BY COALESCE(p.rule_type, 'unknown')
     ORDER BY blocked_ct DESC, flagged_ct DESC`,
    [uuidParam("agentId", agentId), uuidParam("tenantId", tenantId)]
  );

  return rows.map((row) => {
    const rt = getString(row, "rule_type");
    return {
      ruleType: rt,
      policyName: POLICY_LABEL[rt] ?? rt,
      blockedCount: getNumber(row, "blocked_ct"),
      flaggedCount: getNumber(row, "flagged_ct"),
      lastOccurredAt: getNullableString(row, "last_occurred_at"),
    };
  });
}

export async function getAgentLastIncident(
  tenantId: string,
  agentId: string
): Promise<LastIncident | null> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT created_at, action_type, policy_result
     FROM agent_actions
     WHERE agent_id   = :agentId
       AND tenant_id  = :tenantId
       AND policy_result <> 'allowed'
     ORDER BY created_at DESC
     LIMIT 1`,
    [uuidParam("agentId", agentId), uuidParam("tenantId", tenantId)]
  );

  if (rows.length === 0) return null;
  return {
    timestamp: getString(rows[0], "created_at"),
    actionType: getString(rows[0], "action_type"),
    policyResult: getString(rows[0], "policy_result"),
  };
}

export type RiskTrend = "improving" | "stable" | "degrading";

export interface TrendDay {
  date: string;
  total: number;
  blocked: number;
  flagged: number;
  allowed: number;
  trustScore: number;
}

export interface AgentTrustSummary {
  agentId: string;
  agentName: string;
  agentFramework: string | null;
  trustScore: number;
  complianceScore: number;
  violationRate: number;
  riskTrend: RiskTrend;
  totalActions: number;
  blockedCount: number;
  flaggedCount: number;
  allowedCount: number;
  recentTrend: number[];
}

export interface AgentTrustDetail extends AgentTrustSummary {
  trendData: TrendDay[];
}

export function computeTrustScore(
  blockedCount: number,
  flaggedCount: number,
  totalActions: number
): number {
  if (totalActions === 0) return 100;
  const raw = 100 - blockedCount * 10 - flaggedCount * 4;
  return Math.max(0, Math.min(100, raw));
}

export function computeComplianceScore(
  allowedCount: number,
  totalActions: number
): number {
  if (totalActions === 0) return 100;
  return Math.round((allowedCount / totalActions) * 100);
}

export function computeViolationRate(
  blockedCount: number,
  flaggedCount: number,
  totalActions: number
): number {
  if (totalActions === 0) return 0;
  return (blockedCount + flaggedCount) / totalActions;
}

function computeRiskTrend(
  recentViolations: number,
  recentTotal: number,
  priorViolations: number,
  priorTotal: number
): RiskTrend {
  const recentRate = recentTotal > 0 ? recentViolations / recentTotal : 0;
  const priorRate = priorTotal > 0 ? priorViolations / priorTotal : 0;
  if (priorRate === 0 && recentRate === 0) return "stable";
  if (priorRate === 0) return recentRate > 0 ? "degrading" : "stable";
  const delta = (recentRate - priorRate) / priorRate;
  if (delta <= -0.2) return "improving";
  if (delta >= 0.2) return "degrading";
  return "stable";
}

export async function getAgentTrustScores(
  tenantId: string
): Promise<AgentTrustSummary[]> {
  await setTenantContext(tenantId);

  const [allTimeRows, trendRows, sparkRows] = await Promise.all([
    // All-time violation counts per agent
    executeSql(
      `SELECT
         ag.id                                                   AS agent_id,
         ag.name                                                 AS agent_name,
         ag.framework                                            AS agent_framework,
         COUNT(aa.id)                                            AS total_actions,
         COUNT(aa.id) FILTER (WHERE aa.policy_result = 'blocked') AS blocked_ct,
         COUNT(aa.id) FILTER (WHERE aa.policy_result = 'flagged') AS flagged_ct,
         COUNT(aa.id) FILTER (WHERE aa.policy_result = 'allowed') AS allowed_ct
       FROM agents ag
       LEFT JOIN agent_actions aa
         ON aa.agent_id = ag.id AND aa.tenant_id = ag.tenant_id
       WHERE ag.tenant_id = :tenantId
       GROUP BY ag.id, ag.name, ag.framework
       ORDER BY blocked_ct DESC, flagged_ct DESC, ag.name ASC`,
      [uuidParam("tenantId", tenantId)]
    ),

    // Recent 7-day vs prior 7-day violations for trend direction
    executeSql(
      `SELECT
         ag.id AS agent_id,
         COUNT(aa.id) FILTER (
           WHERE aa.created_at >= NOW() - INTERVAL '7 days'
             AND aa.policy_result <> 'allowed'
         ) AS recent_violations,
         COUNT(aa.id) FILTER (
           WHERE aa.created_at >= NOW() - INTERVAL '7 days'
         ) AS recent_total,
         COUNT(aa.id) FILTER (
           WHERE aa.created_at >= NOW() - INTERVAL '14 days'
             AND aa.created_at <  NOW() - INTERVAL '7 days'
             AND aa.policy_result <> 'allowed'
         ) AS prior_violations,
         COUNT(aa.id) FILTER (
           WHERE aa.created_at >= NOW() - INTERVAL '14 days'
             AND aa.created_at <  NOW() - INTERVAL '7 days'
         ) AS prior_total
       FROM agents ag
       LEFT JOIN agent_actions aa
         ON aa.agent_id = ag.id AND aa.tenant_id = ag.tenant_id
       WHERE ag.tenant_id = :tenantId
       GROUP BY ag.id`,
      [uuidParam("tenantId", tenantId)]
    ),

    // Daily trust-score data points for the 7-day sparkline
    executeSql(
      `SELECT
         aa.agent_id,
         DATE_TRUNC('day', aa.created_at)::date            AS action_date,
         COUNT(*)                                           AS total_ct,
         COUNT(*) FILTER (WHERE aa.policy_result = 'blocked') AS blocked_ct,
         COUNT(*) FILTER (WHERE aa.policy_result = 'flagged') AS flagged_ct
       FROM agent_actions aa
       WHERE aa.tenant_id = :tenantId
         AND aa.created_at >= NOW() - INTERVAL '7 days'
       GROUP BY aa.agent_id, action_date
       ORDER BY aa.agent_id, action_date ASC`,
      [uuidParam("tenantId", tenantId)]
    ),
  ]);

  // Build sparkline map: agentId → number[]
  const sparkMap = new Map<string, number[]>();
  for (const row of sparkRows) {
    const id = getString(row, "agent_id");
    const t = getNumber(row, "total_ct");
    const b = getNumber(row, "blocked_ct");
    const f = getNumber(row, "flagged_ct");
    if (!sparkMap.has(id)) sparkMap.set(id, []);
    sparkMap.get(id)!.push(computeTrustScore(b, f, t));
  }

  // Build trend map
  const trendMap = new Map<
    string,
    { rv: number; rt: number; pv: number; pt: number }
  >();
  for (const row of trendRows) {
    trendMap.set(getString(row, "agent_id"), {
      rv: getNumber(row, "recent_violations"),
      rt: getNumber(row, "recent_total"),
      pv: getNumber(row, "prior_violations"),
      pt: getNumber(row, "prior_total"),
    });
  }

  return allTimeRows.map((row) => {
    const agentId = getString(row, "agent_id");
    const total = getNumber(row, "total_actions");
    const blocked = getNumber(row, "blocked_ct");
    const flagged = getNumber(row, "flagged_ct");
    const allowed = getNumber(row, "allowed_ct");
    const t = trendMap.get(agentId);
    return {
      agentId,
      agentName: getString(row, "agent_name"),
      agentFramework: getNullableString(row, "agent_framework"),
      trustScore: computeTrustScore(blocked, flagged, total),
      complianceScore: computeComplianceScore(allowed, total),
      violationRate: computeViolationRate(blocked, flagged, total),
      riskTrend: t
        ? computeRiskTrend(t.rv, t.rt, t.pv, t.pt)
        : "stable",
      totalActions: total,
      blockedCount: blocked,
      flaggedCount: flagged,
      allowedCount: allowed,
      recentTrend: sparkMap.get(agentId) ?? [],
    };
  });
}

export async function getAgentTrustDetail(
  tenantId: string,
  agentId: string
): Promise<AgentTrustDetail | null> {
  await setTenantContext(tenantId);

  const agentRows = await executeSql(
    `SELECT id, name, framework FROM agents
     WHERE id = :agentId AND tenant_id = :tenantId`,
    [uuidParam("agentId", agentId), uuidParam("tenantId", tenantId)]
  );
  if (agentRows.length === 0) return null;

  const [countsRows, trendRows] = await Promise.all([
    executeSql(
      `SELECT
         COUNT(*)                                             AS total_actions,
         COUNT(*) FILTER (WHERE policy_result = 'blocked')   AS blocked_ct,
         COUNT(*) FILTER (WHERE policy_result = 'flagged')   AS flagged_ct,
         COUNT(*) FILTER (WHERE policy_result = 'allowed')   AS allowed_ct
       FROM agent_actions
       WHERE agent_id = :agentId AND tenant_id = :tenantId`,
      [uuidParam("agentId", agentId), uuidParam("tenantId", tenantId)]
    ),
    executeSql(
      `SELECT
         DATE_TRUNC('day', created_at)::date                  AS action_date,
         COUNT(*)                                             AS total_ct,
         COUNT(*) FILTER (WHERE policy_result = 'blocked')   AS blocked_ct,
         COUNT(*) FILTER (WHERE policy_result = 'flagged')   AS flagged_ct,
         COUNT(*) FILTER (WHERE policy_result = 'allowed')   AS allowed_ct
       FROM agent_actions
       WHERE agent_id = :agentId AND tenant_id = :tenantId
         AND created_at >= NOW() - INTERVAL '14 days'
       GROUP BY action_date
       ORDER BY action_date ASC`,
      [uuidParam("agentId", agentId), uuidParam("tenantId", tenantId)]
    ),
  ]);

  const c = countsRows[0] ?? {};
  const total = getNumber(c, "total_actions");
  const blocked = getNumber(c, "blocked_ct");
  const flagged = getNumber(c, "flagged_ct");
  const allowed = getNumber(c, "allowed_ct");

  const trendData: TrendDay[] = trendRows.map((row) => {
    const t = getNumber(row, "total_ct");
    const b = getNumber(row, "blocked_ct");
    const f = getNumber(row, "flagged_ct");
    const a = getNumber(row, "allowed_ct");
    return {
      date: getString(row, "action_date"),
      total: t,
      blocked: b,
      flagged: f,
      allowed: a,
      trustScore: computeTrustScore(b, f, t),
    };
  });

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
  const recentViol = trendData
    .filter((d) => new Date(d.date).getTime() >= sevenDaysAgo)
    .reduce((s, d) => s + d.blocked + d.flagged, 0);
  const recentTotal = trendData
    .filter((d) => new Date(d.date).getTime() >= sevenDaysAgo)
    .reduce((s, d) => s + d.total, 0);
  const priorViol = trendData
    .filter((d) => new Date(d.date).getTime() < sevenDaysAgo)
    .reduce((s, d) => s + d.blocked + d.flagged, 0);
  const priorTotal = trendData
    .filter((d) => new Date(d.date).getTime() < sevenDaysAgo)
    .reduce((s, d) => s + d.total, 0);

  return {
    agentId,
    agentName: getString(agentRows[0], "name"),
    agentFramework: getNullableString(agentRows[0], "framework"),
    trustScore: computeTrustScore(blocked, flagged, total),
    complianceScore: computeComplianceScore(allowed, total),
    violationRate: computeViolationRate(blocked, flagged, total),
    riskTrend: computeRiskTrend(recentViol, recentTotal, priorViol, priorTotal),
    totalActions: total,
    blockedCount: blocked,
    flaggedCount: flagged,
    allowedCount: allowed,
    recentTrend: trendData.map((d) => d.trustScore),
    trendData,
  };
}
