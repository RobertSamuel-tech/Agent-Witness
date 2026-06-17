import { NextRequest, NextResponse } from "next/server";
import { embedTextLocal } from "@/lib/ai/embedder";
import { evaluatePolicy } from "@/lib/ai/policy-engine";
import { getPoliciesByTenant } from "@/lib/db/queries";
import {
  upsertDemoAgents,
  upsertDemoPolicies,
  seedAgentAction,
  countExistingActions,
  type DemoAgent,
} from "@/lib/db/simulate";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Auth ───────────────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.BOOTSTRAP_TOKEN;
  if (!expected) return false;
  return req.headers.get("x-bootstrap-token") === expected;
}

// ── Scenario bank (same events as simulate, used for historical spread) ────────

interface SeedScenario {
  agentName: string;
  actionType: string;
  inputSummary: string;
  outputSummary: string;
  costUsd: number;
  outcomeHint: "allowed" | "blocked" | "flagged";
}

const SEED_SCENARIOS: SeedScenario[] = [
  // ALLOWED
  { agentName: "sales-gpt",        actionType: "tool_use",   inputSummary: "Fetching enterprise pricing tier for Acme Corp proposal",                        outputSummary: "Enterprise $2,400/mo, 50 agents included",                             costUsd: 0.0012, outcomeHint: "allowed" },
  { agentName: "sales-gpt",        actionType: "llm_call",   inputSummary: "Summarizing Q4 pipeline for weekly sales review",                                outputSummary: "22 active deals, $1.8M projected ARR",                                  costUsd: 0.0031, outcomeHint: "allowed" },
  { agentName: "sales-gpt",        actionType: "data_access",inputSummary: "Looking up contact details for BioSync Inc",                                     outputSummary: "VP Engineering, last touchpoint 14 days ago",                          costUsd: 0.0008, outcomeHint: "allowed" },
  { agentName: "sales-gpt",        actionType: "tool_use",   inputSummary: "Updating CRM opportunity stage for Globex deal",                                 outputSummary: "CRM updated, follow-up task created for 2025-01-15",                   costUsd: 0.0007, outcomeHint: "allowed" },
  { agentName: "sales-gpt",        actionType: "llm_call",   inputSummary: "Generating outreach email sequence for fintech segment",                          outputSummary: "3-email sequence drafted, personalization tokens injected",             costUsd: 0.0041, outcomeHint: "allowed" },
  { agentName: "support-bot",      actionType: "llm_call",   inputSummary: "Customer inquiry about SLA for Enterprise support response time",                outputSummary: "1-hour response, 4-hour resolution for P1 incidents",                  costUsd: 0.0021, outcomeHint: "allowed" },
  { agentName: "support-bot",      actionType: "tool_use",   inputSummary: "Looking up ticket TKT-9423 status for escalation",                              outputSummary: "In progress, Tier-2 assigned, ETA 2 business days",                    costUsd: 0.0009, outcomeHint: "allowed" },
  { agentName: "support-bot",      actionType: "llm_call",   inputSummary: "Drafting resolution for billing discrepancy TKT-9019",                           outputSummary: "Credited $42.00 per usage calculation review",                         costUsd: 0.0018, outcomeHint: "allowed" },
  { agentName: "support-bot",      actionType: "tool_use",   inputSummary: "Creating follow-up task after product demo session",                             outputSummary: "Follow-up scheduled for 2025-01-20",                                   costUsd: 0.0006, outcomeHint: "allowed" },
  { agentName: "support-bot",      actionType: "llm_call",   inputSummary: "Classifying incoming support ticket about API timeout errors",                   outputSummary: "Classified P2 Technical, routed to engineering queue",                 costUsd: 0.0014, outcomeHint: "allowed" },
  { agentName: "billing-agent",    actionType: "data_access",inputSummary: "Fetching invoice INV-2024-1042 for monthly reconciliation",                       outputSummary: "Invoice $1,299.00, Paid, received 2024-12-01",                         costUsd: 0.0005, outcomeHint: "allowed" },
  { agentName: "billing-agent",    actionType: "tool_use",   inputSummary: "Processing subscription renewal for account acct-0892",                          outputSummary: "Renewal confirmed, next billing 2025-02-01",                           costUsd: 0.0011, outcomeHint: "allowed" },
  { agentName: "billing-agent",    actionType: "data_access",inputSummary: "Checking usage metrics to prepare utilization report",                           outputSummary: "4,231 API calls, $0.82 cost this month",                               costUsd: 0.0007, outcomeHint: "allowed" },
  { agentName: "billing-agent",    actionType: "tool_use",   inputSummary: "Applying promotional discount to new enterprise signup",                         outputSummary: "15% discount applied for first 3 billing cycles",                     costUsd: 0.0009, outcomeHint: "allowed" },
  { agentName: "onboarding-agent", actionType: "email_send", inputSummary: "Sending onboarding step 1 email to new enterprise customer",                     outputSummary: "Email delivered to cto@newcustomer.io",                                costUsd: 0.0004, outcomeHint: "allowed" },
  { agentName: "onboarding-agent", actionType: "tool_use",   inputSummary: "Creating workspace for new team on AgentWitness platform",                       outputSummary: "Workspace acme-demo.agentwitness.io created",                          costUsd: 0.0013, outcomeHint: "allowed" },
  { agentName: "onboarding-agent", actionType: "llm_call",   inputSummary: "Generating onboarding checklist for financial services customer",                 outputSummary: "12-step checklist: compliance, SSO, API integration, training",        costUsd: 0.0025, outcomeHint: "allowed" },
  { agentName: "onboarding-agent", actionType: "email_send", inputSummary: "Sending day-3 product tips email to activated enterprise account",               outputSummary: "Tips email delivered, 68% open rate",                                  costUsd: 0.0004, outcomeHint: "allowed" },
  { agentName: "compliance-agent", actionType: "data_access",inputSummary: "Reviewing SOC 2 audit trail for Q4 evidence collection",                         outputSummary: "347 audit records retrieved, 99.1% compliance rate",                   costUsd: 0.0006, outcomeHint: "allowed" },
  { agentName: "compliance-agent", actionType: "llm_call",   inputSummary: "Generating governance posture summary for board meeting",                         outputSummary: "Report: governance score 94/100, 3 low-risk findings",                 costUsd: 0.0042, outcomeHint: "allowed" },
  { agentName: "compliance-agent", actionType: "tool_use",   inputSummary: "Verifying EU AI Act article 12 compliance",                                       outputSummary: "1,204 actions logged with required metadata",                          costUsd: 0.0016, outcomeHint: "allowed" },
  { agentName: "compliance-agent", actionType: "data_access",inputSummary: "Fetching agent risk scores for governance dashboard refresh",                     outputSummary: "5 agents updated, average trust score 87/100",                        costUsd: 0.0008, outcomeHint: "allowed" },
  // BLOCKED
  { agentName: "billing-agent",    actionType: "data_access",inputSummary: "Retrieving customer credit card details for payment retry",                       outputSummary: "Accessing stored payment vault",                                       costUsd: 0.0008, outcomeHint: "blocked" },
  { agentName: "support-bot",      actionType: "data_access",inputSummary: "Fetching user password hash for account recovery",                               outputSummary: "Querying authentication store",                                        costUsd: 0.0006, outcomeHint: "blocked" },
  { agentName: "billing-agent",    actionType: "data_access",inputSummary: "Looking up customer SSN for W-9 tax document",                                   outputSummary: "Accessing identity verification record",                               costUsd: 0.0009, outcomeHint: "blocked" },
  { agentName: "sales-gpt",        actionType: "llm_call",   inputSummary: "Extracting PII fields from customer form submissions",                            outputSummary: "Identifying sensitive data in customer input",                         costUsd: 0.0022, outcomeHint: "blocked" },
  { agentName: "sales-gpt",        actionType: "tool_use",   inputSummary: "Scraping product specs from competitor websites",                                 outputSummary: "Fetched pricing from competitor.com product page",                     costUsd: 0.0014, outcomeHint: "blocked" },
  { agentName: "onboarding-agent", actionType: "email_send", inputSummary: "Sending contract follow-up to prospective partner",                              outputSummary: "Dispatching email to admin@evil.com endpoint",                        costUsd: 0.0003, outcomeHint: "blocked" },
  { agentName: "compliance-agent", actionType: "data_access",inputSummary: "Collecting personal information for external audit report",                       outputSummary: "Retrieving personal data from customer records",                       costUsd: 0.0011, outcomeHint: "blocked" },
  // FLAGGED
  { agentName: "billing-agent",    actionType: "data_access",inputSummary: "Initiating bulk export of all customer transactions for Q4 audit",                outputSummary: "Export archive prepared with 14,000 records",                          costUsd: 0.0018, outcomeHint: "flagged" },
  { agentName: "compliance-agent", actionType: "data_access",inputSummary: "Starting mass download of agent logs for compliance review",                     outputSummary: "8,341 log entries compiled",                                           costUsd: 0.0031, outcomeHint: "flagged" },
  { agentName: "sales-gpt",        actionType: "tool_use",   inputSummary: "Running bulk update on pricing tier for all SMB accounts",                       outputSummary: "283 account modifications queued",                                     costUsd: 0.0027, outcomeHint: "flagged" },
  { agentName: "support-bot",      actionType: "llm_call",   inputSummary: "Executing bulk closure of resolved support tickets from last quarter",            outputSummary: "412 tickets staged for resolution",                                    costUsd: 0.0019, outcomeHint: "flagged" },
];

// Weighted index: 70% allowed, 20% blocked, 10% flagged
function pickSeedScenario(): SeedScenario {
  const r = Math.random();
  const allowed  = SEED_SCENARIOS.filter((s) => s.outcomeHint === "allowed");
  const blocked  = SEED_SCENARIOS.filter((s) => s.outcomeHint === "blocked");
  const flagged  = SEED_SCENARIOS.filter((s) => s.outcomeHint === "flagged");
  if (r < 0.70) return allowed[Math.floor(Math.random() * allowed.length)];
  if (r < 0.90) return blocked[Math.floor(Math.random() * blocked.length)];
  return flagged[Math.floor(Math.random() * flagged.length)];
}

// ── Backdated timestamp helpers ────────────────────────────────────────────────

function randomPastTimestamp(daysAgo: number): Date {
  const now = Date.now();
  // Spread within the day; weight toward business hours (offset 8h-20h)
  const dayMs = 24 * 3600 * 1000;
  const baseOffset = daysAgo * dayMs;
  const intraDay = Math.floor(Math.random() * dayMs);
  return new Date(now - baseOffset + intraDay - dayMs);
}

// ── POST handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id" }, { status: 400 });
  }

  let targetCount = 300;
  let days = 7;
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (typeof body.count === "number") targetCount = Math.min(1000, Math.max(10, body.count));
    if (typeof body.days  === "number") days        = Math.min(30,   Math.max(1,  body.days));
  } catch { /* ignore */ }

  const t0 = Date.now();

  try {
    // Idempotency guard: skip if already seeded
    const existing = await countExistingActions(tenantId);
    if (existing >= targetCount) {
      return NextResponse.json({
        skipped: true,
        message: `Already have ${existing} events (≥ ${targetCount}). Delete events or pass a higher count to re-seed.`,
        existing,
      });
    }

    // Ensure demo agents + policies exist
    const [agents] = await Promise.all([
      upsertDemoAgents(tenantId),
      upsertDemoPolicies(tenantId),
    ]);

    const agentMap = new Map<string, DemoAgent>(agents.map((a) => [a.name, a]));
    const activePolicies = await getPoliciesByTenant(tenantId, true);

    const toInsert = targetCount - existing;
    let inserted = 0;

    for (let i = 0; i < toInsert; i++) {
      const scenario = pickSeedScenario();
      const agent = agentMap.get(scenario.agentName);
      if (!agent) continue;

      const actionInput = {
        inputSummary:  scenario.inputSummary,
        outputSummary: scenario.outputSummary,
        inputMetadata: { seeded: true },
        outputMetadata: {},
        costUsd: scenario.costUsd,
      };

      const evaluation = evaluatePolicy(actionInput, activePolicies);

      // Use instant local embedding for seed (no API calls, always 1536-dim)
      const embedding = embedTextLocal(`${scenario.inputSummary} | ${scenario.outputSummary}`);

      const daysAgo = Math.random() * days;
      const createdAt = randomPastTimestamp(daysAgo);

      await seedAgentAction({
        tenant_id:     tenantId,
        agent_id:      agent.id,
        action_type:   scenario.actionType,
        input_summary: scenario.inputSummary,
        input_metadata: actionInput.inputMetadata,
        output_summary: scenario.outputSummary,
        output_metadata: {},
        policy_id:     evaluation.matchedPolicyId ?? null,
        policy_result: evaluation.result,
        cost_usd:      scenario.costUsd,
        embedding,
        created_at:    createdAt,
      });

      inserted++;
    }

    return NextResponse.json({
      inserted,
      existing,
      total: existing + inserted,
      totalMs: Date.now() - t0,
    });
  } catch (error) {
    console.error("[seed] POST failed", error);
    return NextResponse.json({ error: "Seed failed", detail: String(error) }, { status: 500 });
  }
}
