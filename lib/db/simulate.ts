import {
  executeSql,
  uuidParam,
  textParam,
  jsonParam,
  decimalParam,
  vectorParam,
  getString,
  getNumber,
  type QueryParameter,
} from "./index";
import { setTenantContext } from "./rls";

// ── Demo agent definitions ─────────────────────────────────────────────────────

export const DEMO_AGENT_DEFS = [
  { name: "sales-gpt",        framework: "OpenAI"   },
  { name: "support-bot",      framework: "LangChain" },
  { name: "billing-agent",    framework: "AutoGen"   },
  { name: "onboarding-agent", framework: "CrewAI"    },
  { name: "compliance-agent", framework: "OpenAI"    },
] as const;

export interface DemoAgent {
  id: string;
  name: string;
  framework: string;
}

// ── Demo policy definitions ────────────────────────────────────────────────────

const DEMO_POLICY_DEFS = [
  {
    rule_type: "domain_block",
    rule_config: { blocked_domains: ["evil.com", "competitor.com", "phishing.io"] },
  },
  {
    rule_type: "cost_limit",
    rule_config: { max_cost: 5 },
  },
  {
    rule_type: "data_masking",
    rule_config: { block_pii: true },
  },
] as const;

// ── Upsert helpers ─────────────────────────────────────────────────────────────

export async function upsertDemoAgents(tenantId: string): Promise<DemoAgent[]> {
  await setTenantContext(tenantId);
  const result: DemoAgent[] = [];

  for (const def of DEMO_AGENT_DEFS) {
    const existing = await executeSql(
      `SELECT id FROM agents WHERE tenant_id = :tenantId AND name = :name LIMIT 1`,
      [uuidParam("tenantId", tenantId), textParam("name", def.name)]
    );

    if (existing.length > 0) {
      result.push({ id: getString(existing[0], "id"), name: def.name, framework: def.framework });
    } else {
      const rows = await executeSql(
        `INSERT INTO agents (tenant_id, name, framework, status)
         VALUES (:tenantId, :name, :framework, 'active')
         RETURNING id`,
        [uuidParam("tenantId", tenantId), textParam("name", def.name), textParam("framework", def.framework)]
      );
      result.push({ id: getString(rows[0], "id"), name: def.name, framework: def.framework });
    }
  }

  return result;
}

export async function upsertDemoPolicies(tenantId: string): Promise<number> {
  await setTenantContext(tenantId);

  const existing = await executeSql(
    `SELECT rule_type FROM policies WHERE tenant_id = :tenantId AND is_active = true`,
    [uuidParam("tenantId", tenantId)]
  );
  const existingTypes = new Set(existing.map((r) => getString(r, "rule_type")));

  let inserted = 0;
  for (const def of DEMO_POLICY_DEFS) {
    if (!existingTypes.has(def.rule_type)) {
      await executeSql(
        `INSERT INTO policies (tenant_id, rule_type, rule_config, is_active)
         VALUES (:tenantId, :ruleType, :ruleConfig, true)`,
        [
          uuidParam("tenantId", tenantId),
          textParam("ruleType", def.rule_type),
          jsonParam("ruleConfig", def.rule_config),
        ]
      );
      inserted++;
    }
  }
  return inserted;
}

// ── Seed insert (supports custom created_at for historical data) ──────────────

export interface SeedActionData {
  tenant_id: string;
  agent_id: string;
  action_type: string;
  input_summary: string;
  input_metadata: Record<string, unknown>;
  output_summary: string;
  output_metadata: Record<string, unknown>;
  policy_id: string | null;
  policy_result: string;
  cost_usd: number | null;
  embedding: number[] | null;
  created_at: Date;
}

export async function seedAgentAction(data: SeedActionData): Promise<string> {
  await setTenantContext(data.tenant_id);

  const params: QueryParameter[] = [
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
    { name: "createdAt", value: data.created_at.toISOString() },
  ];

  const rows = await executeSql(
    `INSERT INTO agent_actions (
       tenant_id, agent_id, action_type, input_summary, input_metadata,
       output_summary, output_metadata, policy_id, policy_result, cost_usd,
       embedding, created_at
     ) VALUES (
       :tenantId, :agentId, :actionType, :inputSummary, :inputMetadata,
       :outputSummary, :outputMetadata, :policyId, :policyResult, :costUsd,
       :embedding::vector, :createdAt::timestamptz
     )
     RETURNING id`,
    params
  );

  return getString(rows[0], "id");
}

// ── Count existing events (for idempotent seed guard) ─────────────────────────

export async function countExistingActions(tenantId: string): Promise<number> {
  await setTenantContext(tenantId);

  const rows = await executeSql(
    `SELECT COUNT(*) AS cnt FROM agent_actions WHERE tenant_id = :tenantId`,
    [uuidParam("tenantId", tenantId)]
  );
  return getNumber(rows[0], "cnt");
}
