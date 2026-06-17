import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/ai/embedder";
import { evaluatePolicy } from "@/lib/ai/policy-engine";
import { getPoliciesByTenant, insertAgentAction } from "@/lib/db/queries";
import { upsertDemoAgents, upsertDemoPolicies, type DemoAgent } from "@/lib/db/simulate";
import { putAgentEvent } from "@/lib/dynamodb";
import { isExecutionPaused } from "@/lib/db/emergency-controls";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Scenario bank ──────────────────────────────────────────────────────────────
// Texts are crafted so the policy engine produces the expected outcome.
// BLOCKED = contains PII keywords (credit card / password / ssn / pii / personal)
//           OR output contains blocked domain (competitor.com / evil.com)
// FLAGGED = input contains anomaly keywords (export / download / mass / bulk)
// ALLOWED = normal operations with none of the above

interface Scenario {
  agentName: string;
  actionType: string;
  inputSummary: string;
  outputSummary: string;
  costUsd: number;
}

const ALLOWED: Scenario[] = [
  { agentName: "sales-gpt",        actionType: "tool_use",   inputSummary: "Fetching enterprise pricing tier for Acme Corp proposal",                        outputSummary: "Retrieved pricing sheet: Enterprise $2,400/mo, 50 agents included",      costUsd: 0.0012 },
  { agentName: "sales-gpt",        actionType: "llm_call",   inputSummary: "Summarizing Q4 pipeline from CRM for weekly sales review meeting",               outputSummary: "Pipeline summary: 22 active deals, $1.8M projected ARR",                  costUsd: 0.0031 },
  { agentName: "sales-gpt",        actionType: "data_access",inputSummary: "Looking up contact details for prospect BioSync Inc to prepare outreach",        outputSummary: "Found VP Engineering, last touchpoint 14 days ago",                       costUsd: 0.0008 },
  { agentName: "sales-gpt",        actionType: "tool_use",   inputSummary: "Updating CRM opportunity stage for Globex deal to Proposal Sent",                outputSummary: "CRM updated, follow-up task created for 2025-01-15",                       costUsd: 0.0007 },
  { agentName: "support-bot",      actionType: "llm_call",   inputSummary: "Customer asking about SLA for Enterprise tier response time commitments",        outputSummary: "Enterprise SLA: 1-hour response, 4-hour resolution for P1 incidents",    costUsd: 0.0021 },
  { agentName: "support-bot",      actionType: "tool_use",   inputSummary: "Looking up ticket TKT-9423 status for customer escalation request",              outputSummary: "Ticket in progress: assigned Tier-2, ETA 2 business days",                costUsd: 0.0009 },
  { agentName: "support-bot",      actionType: "llm_call",   inputSummary: "Drafting resolution note for billing discrepancy case TKT-9019",                 outputSummary: "Drafted: Credited $42.00 per usage calculation review",                    costUsd: 0.0018 },
  { agentName: "support-bot",      actionType: "tool_use",   inputSummary: "Creating follow-up task for customer after product demo session",                 outputSummary: "Follow-up scheduled for 2025-01-20 with product team",                    costUsd: 0.0006 },
  { agentName: "billing-agent",    actionType: "data_access",inputSummary: "Fetching invoice INV-2024-1042 for monthly reconciliation",                       outputSummary: "Invoice $1,299.00, status Paid, received 2024-12-01",                     costUsd: 0.0005 },
  { agentName: "billing-agent",    actionType: "tool_use",   inputSummary: "Processing subscription renewal for account acct-0892",                          outputSummary: "Renewal confirmed, next billing cycle 2025-02-01",                        costUsd: 0.0011 },
  { agentName: "billing-agent",    actionType: "data_access",inputSummary: "Checking monthly usage metrics for customer to prepare utilization report",       outputSummary: "Usage: 4,231 API calls, $0.82 total cost this month",                     costUsd: 0.0007 },
  { agentName: "billing-agent",    actionType: "tool_use",   inputSummary: "Applying promotional discount to new enterprise signup per sales request",        outputSummary: "15% discount applied, effective for first 3 billing cycles",              costUsd: 0.0009 },
  { agentName: "onboarding-agent", actionType: "email_send", inputSummary: "Sending onboarding sequence email step 1 to new enterprise customer",            outputSummary: "Email delivered to cto@newcustomer.io, open event tracked",               costUsd: 0.0004 },
  { agentName: "onboarding-agent", actionType: "tool_use",   inputSummary: "Creating workspace environment for new team joining AgentWitness platform",       outputSummary: "Workspace acme-demo.agentwitness.io created, admin user invited",        costUsd: 0.0013 },
  { agentName: "onboarding-agent", actionType: "llm_call",   inputSummary: "Generating custom onboarding checklist for financial services customer",          outputSummary: "12-step checklist: compliance setup, SSO, API integration, training",     costUsd: 0.0025 },
  { agentName: "onboarding-agent", actionType: "email_send", inputSummary: "Sending day-3 product tips email to recently activated enterprise account",       outputSummary: "Tips email delivered, 68% open rate on this sequence",                    costUsd: 0.0004 },
  { agentName: "compliance-agent", actionType: "data_access",inputSummary: "Reviewing SOC 2 audit trail for Q4 evidence collection period",                  outputSummary: "Retrieved 347 audit records, 99.1% compliance rate for period",          costUsd: 0.0006 },
  { agentName: "compliance-agent", actionType: "llm_call",   inputSummary: "Generating governance posture summary for board meeting presentation",            outputSummary: "Report drafted: governance score 94/100, 3 low-risk findings",            costUsd: 0.0042 },
  { agentName: "compliance-agent", actionType: "tool_use",   inputSummary: "Verifying EU AI Act article 12 compliance for current audit period",              outputSummary: "Compliance verified: 1,204 actions logged with required metadata",         costUsd: 0.0016 },
  { agentName: "compliance-agent", actionType: "data_access",inputSummary: "Fetching agent risk scores for monthly governance dashboard refresh",             outputSummary: "Risk scores updated for 5 agents, average trust score 87/100",           costUsd: 0.0008 },
];

const BLOCKED: Scenario[] = [
  // data_masking — "credit card"
  { agentName: "billing-agent",    actionType: "data_access",inputSummary: "Retrieving customer credit card details for payment retry automation",            outputSummary: "Accessing stored payment vault for card number extraction",              costUsd: 0.0008 },
  // data_masking — "password"
  { agentName: "support-bot",      actionType: "data_access",inputSummary: "Fetching user password hash to assist with account recovery request",             outputSummary: "Querying authentication store for credential reset",                     costUsd: 0.0006 },
  // data_masking — "ssn"
  { agentName: "billing-agent",    actionType: "data_access",inputSummary: "Looking up customer SSN for W-9 tax document generation",                         outputSummary: "Accessing identity verification record for tax filing",                  costUsd: 0.0009 },
  // data_masking — "pii"
  { agentName: "sales-gpt",        actionType: "llm_call",   inputSummary: "Extracting PII fields from raw customer form submissions for data enrichment",     outputSummary: "Identifying sensitive data patterns in unstructured customer input",     costUsd: 0.0022 },
  // data_masking — "personal"
  { agentName: "compliance-agent", actionType: "data_access",inputSummary: "Collecting personal information from user profiles for external audit report",     outputSummary: "Retrieving personal data fields from customer identity records",        costUsd: 0.0011 },
  // domain_block — "competitor.com"
  { agentName: "sales-gpt",        actionType: "tool_use",   inputSummary: "Scraping product specifications from competitor websites for pricing analysis",    outputSummary: "Fetched pricing data from competitor.com product listing page",         costUsd: 0.0014 },
  // domain_block — "evil.com"
  { agentName: "onboarding-agent", actionType: "email_send", inputSummary: "Sending contract follow-up to prospective partner organization",                  outputSummary: "Dispatching outreach email to admin@evil.com endpoint",                 costUsd: 0.0003 },
];

const FLAGGED: Scenario[] = [
  { agentName: "billing-agent",    actionType: "data_access",inputSummary: "Initiating bulk export of all customer transaction records for Q4 audit",          outputSummary: "Prepared export archive with 14,000 transaction records",               costUsd: 0.0018 },
  { agentName: "compliance-agent", actionType: "data_access",inputSummary: "Starting mass download of agent action logs for external compliance review",        outputSummary: "Compiled 8,341 log entries into export archive",                       costUsd: 0.0031 },
  { agentName: "sales-gpt",        actionType: "tool_use",   inputSummary: "Running bulk update on pricing tier for all SMB customer accounts",                outputSummary: "Queued 283 account modifications for batch processing",                 costUsd: 0.0027 },
  { agentName: "support-bot",      actionType: "llm_call",   inputSummary: "Executing bulk closure of all resolved support tickets from last quarter",          outputSummary: "Staged 412 tickets for automated resolution marking",                   costUsd: 0.0019 },
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickScenario(): Scenario {
  const r = Math.random();
  if (r < 0.70) return pickRandom(ALLOWED);
  if (r < 0.90) return pickRandom(BLOCKED);
  return pickRandom(FLAGGED);
}

// ── Tenant validation ──────────────────────────────────────────────────────────

function getTenantId(req: NextRequest): string | null {
  const id = req.headers.get("x-tenant-id");
  return id && UUID_PATTERN.test(id) ? id : null;
}

// ── Agent lookup map (cached per request) ─────────────────────────────────────

let agentCache: Map<string, DemoAgent> | null = null;
let agentCacheTenantId: string | null = null;

async function getAgentMap(tenantId: string): Promise<Map<string, DemoAgent>> {
  if (agentCache && agentCacheTenantId === tenantId) return agentCache;
  const agents = await upsertDemoAgents(tenantId);
  agentCache = new Map(agents.map((a) => [a.name, a]));
  agentCacheTenantId = tenantId;
  return agentCache;
}

// ── GET: status ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const tenantId = getTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id" }, { status: 400 });
  }

  try {
    const agents = await upsertDemoAgents(tenantId);
    const policies = await getPoliciesByTenant(tenantId, true);
    return NextResponse.json({
      ready: true,
      agents: agents.map((a) => ({ name: a.name, framework: a.framework })),
      activePolicies: policies.length,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get simulate status", detail: String(error) }, { status: 500 });
  }
}

// ── POST: generate one or more events ─────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const tenantId = getTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id" }, { status: 400 });
  }

  let count = 1;
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (typeof body.count === "number") count = Math.min(5, Math.max(1, Math.floor(body.count)));
  } catch { /* ignore */ }

  const paused = await isExecutionPaused(tenantId).catch(() => false);
  if (paused) {
    return NextResponse.json(
      { error: "Agent execution is paused via Control Center", paused: true },
      { status: 423 }
    );
  }

  const t0 = Date.now();

  try {
    // Ensure demo agents + policies exist
    const [agentMap] = await Promise.all([
      getAgentMap(tenantId),
      upsertDemoPolicies(tenantId),
    ]);

    const activePolicies = await getPoliciesByTenant(tenantId, true);

    const results = [];

    for (let i = 0; i < count; i++) {
      const t1 = Date.now();
      const scenario = pickScenario();
      const agent = agentMap.get(scenario.agentName);
      if (!agent) continue;

      const actionInput = {
        inputSummary: scenario.inputSummary,
        outputSummary: scenario.outputSummary,
        inputMetadata: { simulator: true, agentName: agent.name },
        outputMetadata: {},
        costUsd: scenario.costUsd,
      };

      const evaluation = evaluatePolicy(actionInput, activePolicies);

      // Generate embedding (uses local fallback if OpenRouter unavailable)
      const embedding = await embedText(`${scenario.inputSummary} | ${scenario.outputSummary}`);

      const action = await insertAgentAction({
        tenant_id: tenantId,
        agent_id: agent.id,
        action_type: scenario.actionType,
        input_summary: scenario.inputSummary,
        input_metadata: actionInput.inputMetadata,
        output_summary: scenario.outputSummary,
        output_metadata: {},
        policy_id: evaluation.matchedPolicyId ?? null,
        policy_result: evaluation.result,
        cost_usd: scenario.costUsd,
        embedding,
      });

      // Mirror to DynamoDB hot path for live stream visibility
      putAgentEvent({
        agentId:   agent.id,
        eventType: scenario.actionType,
        tenantId,
        payload: {
          agentName:    agent.name,
          actionId:     action.id,
          policyResult: action.policy_result,
          policyId:     evaluation.matchedPolicyId ?? null,
          inputSummary: scenario.inputSummary,
          costUsd:      scenario.costUsd,
        },
      }).catch((err: unknown) => {
        console.error("[simulate] DynamoDB mirror failed", err);
      });

      results.push({
        id:           action.id,
        agentId:      agent.id,
        agentName:    agent.name,
        actionType:   scenario.actionType,
        policyResult: action.policy_result,
        inputSummary: scenario.inputSummary,
        insertedAt:   new Date().toISOString(),
        latencyMs:    Date.now() - t1,
      });
    }

    return NextResponse.json({
      events: results,
      totalMs: Date.now() - t0,
    });
  } catch (error) {
    console.error("[simulate] POST failed", error);
    return NextResponse.json({ error: "Simulation failed", detail: String(error) }, { status: 500 });
  }
}
