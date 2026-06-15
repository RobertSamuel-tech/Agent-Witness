export type PlanType = "starter" | "pro" | "enterprise";

export type AgentStatus = "active" | "inactive";

export type PolicyRuleType =
  | "cost_limit"
  | "data_masking"
  | "domain_block";

export type PolicyResult =
  | "allowed"
  | "blocked"
  | "flagged";

export interface Tenant {
  id: string;
  name: string;
  plan: PlanType;
  created_at: string;
}

export interface TenantSummary {
  id: string;
  name: string;
  plan: PlanType;
}

export interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  framework: string | null;
  status: AgentStatus;
  created_at: string;
}

export interface Policy {
  id: string;
  tenant_id: string;
  rule_type: PolicyRuleType;
  rule_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface AgentAction {
  id: string;
  tenant_id: string;
  agent_id: string;
  action_type: string;
  input_summary: string;
  input_metadata: Record<string, unknown>;
  output_summary: string;
  output_metadata: Record<string, unknown>;
  policy_id: string | null;
  policy_result: PolicyResult;
  cost_usd: number | null;
  embedding: number[] | null;
  created_at: string;
}
