/**
 * Phase 8B — Policy engine validation.
 *
 * Exercises the running dev server (http://localhost:3000) end-to-end:
 * creates the three policy types for the Acme tenant, ingests three
 * actions expected to be blocked (one per policy) and two expected to be
 * allowed, then runs a semantic search to confirm the blocked SSN action
 * ranks near the top for a related query.
 *
 * Run with: node --env-file=.env scripts/verify-policy-engine.ts
 */
import { Pool } from "pg";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";

interface StepResult {
  step: string;
  ok: boolean;
  status?: number;
  detail: unknown;
}

const results: StepResult[] = [];

function record(step: string, ok: boolean, detail: unknown, status?: number): void {
  results.push({ step, ok, status, detail });
  console.log(`\n=== ${step} ===`);
  console.log("ok:", ok, status !== undefined ? `status: ${status}` : "");
  console.log(JSON.stringify(detail, null, 2));
}

async function createPolicy(
  tenantId: string,
  ruleType: string,
  ruleConfig: Record<string, unknown>
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${BASE_URL}/api/policies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
    body: JSON.stringify({ ruleType, ruleConfig, isActive: true }),
  });
  const body = await res.json();
  return { ok: res.status === 201, status: res.status, body };
}

async function ingest(
  tenantId: string,
  agentId: string,
  payload: {
    actionType: string;
    inputSummary: string;
    outputSummary: string;
    costUsd?: number | null;
  }
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${BASE_URL}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
    body: JSON.stringify({ agentId, ...payload }),
  });
  const body = await res.json();
  return { ok: res.status === 200 || res.status === 403, status: res.status, body };
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Resolve Acme tenant and an agent to attribute actions to.
  const tenantRows = await pool.query("SELECT id, name FROM tenants WHERE name = 'Acme Corporation'");
  if (tenantRows.rows.length === 0) throw new Error("Acme Corporation tenant not found");
  const tenantId: string = tenantRows.rows[0].id;

  let agentRows = await pool.query("SELECT id FROM agents WHERE tenant_id = $1 LIMIT 1", [tenantId]);
  if (agentRows.rows.length === 0) {
    agentRows = await pool.query(
      `INSERT INTO agents (tenant_id, name, framework, status) VALUES ($1, $2, $3, 'active') RETURNING id`,
      [tenantId, "policy-verification agent", "verification-script"]
    );
  }
  const agentId: string = agentRows.rows[0].id;
  record("PREREQ: resolve tenant + agent", true, { tenantId, agentId });

  // 1. Create three policies for Acme.
  let policiesCreated = 0;

  const dataMaskingPolicy = await createPolicy(tenantId, "data_masking", { block_pii: true });
  record("STEP 1a: create data_masking policy", dataMaskingPolicy.ok, dataMaskingPolicy.body, dataMaskingPolicy.status);
  if (dataMaskingPolicy.ok) policiesCreated++;

  const costLimitPolicy = await createPolicy(tenantId, "cost_limit", { max_cost: 5.0 });
  record("STEP 1b: create cost_limit policy", costLimitPolicy.ok, costLimitPolicy.body, costLimitPolicy.status);
  if (costLimitPolicy.ok) policiesCreated++;

  const domainBlockPolicy = await createPolicy(tenantId, "domain_block", { blocked_domains: ["evil.com"] });
  record("STEP 1c: create domain_block policy", domainBlockPolicy.ok, domainBlockPolicy.body, domainBlockPolicy.status);
  if (domainBlockPolicy.ok) policiesCreated++;

  // 2. Ingest 3 actions expected to be blocked.
  let actionsInserted = 0;
  let blockedCount = 0;
  let allowedCount = 0;
  let ssnActionId: string | null = null;

  const ssnAction = await ingest(tenantId, agentId, {
    actionType: "data_access",
    inputSummary: "Sent SSN to external API",
    outputSummary: "Forwarded customer SSN to partner verification service",
    costUsd: 0.01,
  });
  record("STEP 2A: ingest 'Sent SSN to external API' (expect blocked)", ssnAction.ok && ssnAction.body.policyResult === "blocked" || ssnAction.status === 403, ssnAction.body, ssnAction.status);
  if (ssnAction.status === 200 || ssnAction.status === 403) actionsInserted++;
  if (ssnAction.body.policyResult === "blocked" || ssnAction.body.blocked === true) {
    blockedCount++;
    ssnActionId = (ssnAction.body.id ?? ssnAction.body.actionId ?? null) as string | null;
  }

  const costAction = await ingest(tenantId, agentId, {
    actionType: "llm_call",
    inputSummary: "Cost exceeded $7.25 on GPT request",
    outputSummary: "Completed GPT-4 request at a cost of $7.25",
    costUsd: 7.25,
  });
  record("STEP 2B: ingest 'Cost exceeded $7.25 on GPT request' (expect blocked)", costAction.body.policyResult === "blocked" || costAction.body.blocked === true, costAction.body, costAction.status);
  if (costAction.status === 200 || costAction.status === 403) actionsInserted++;
  if (costAction.body.policyResult === "blocked" || costAction.body.blocked === true) blockedCount++;

  const domainAction = await ingest(tenantId, agentId, {
    actionType: "tool_use",
    inputSummary: "Called external data broker API",
    outputSummary: "Called evil.com data broker",
    costUsd: 0.01,
  });
  record("STEP 2C: ingest 'Called evil.com data broker' (expect blocked)", domainAction.body.policyResult === "blocked" || domainAction.body.blocked === true, domainAction.body, domainAction.status);
  if (domainAction.status === 200 || domainAction.status === 403) actionsInserted++;
  if (domainAction.body.policyResult === "blocked" || domainAction.body.blocked === true) blockedCount++;

  // 3. Ingest 2 normal actions expected to be allowed.
  const reportAction = await ingest(tenantId, agentId, {
    actionType: "tool_use",
    inputSummary: "Generated quarterly sales report",
    outputSummary: "Created PDF summary of Q2 sales figures",
    costUsd: 0.05,
  });
  record("STEP 3A: ingest 'Generated quarterly sales report' (expect allowed)", reportAction.body.policyResult === "allowed", reportAction.body, reportAction.status);
  if (reportAction.status === 200) actionsInserted++;
  if (reportAction.body.policyResult === "allowed") allowedCount++;

  const emailAction = await ingest(tenantId, agentId, {
    actionType: "tool_use",
    inputSummary: "Sent welcome email",
    outputSummary: "Delivered onboarding email to new user",
    costUsd: 0.001,
  });
  record("STEP 3B: ingest 'Sent welcome email' (expect allowed)", emailAction.body.policyResult === "allowed", emailAction.body, emailAction.status);
  if (emailAction.status === 200) actionsInserted++;
  if (emailAction.body.policyResult === "allowed") allowedCount++;

  // 4. Semantic search.
  const searchRes = await fetch(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
    body: JSON.stringify({ query: "unauthorized PII export" }),
  });
  const searchBody = await searchRes.json();
  record("STEP 4: POST /api/search 'unauthorized PII export'", searchRes.status === 200, searchBody, searchRes.status);

  let searchVerified = false;
  if (Array.isArray(searchBody.results)) {
    const searchResults = searchBody.results as Array<Record<string, unknown>>;
    const ssnIndex = searchResults.findIndex((r) => r.id === ssnActionId);
    searchVerified = ssnIndex !== -1 && ssnIndex < 3; // "near the top"
    record("STEP 4 verification: SSN action rank", searchVerified, {
      ssnActionId,
      rank: ssnIndex,
      results: searchResults.map((r) => ({ id: r.id, input_summary: r.input_summary, similarity: r.similarity })),
    });
  }

  await pool.end();

  // 5. Final report.
  const report = { policiesCreated, actionsInserted, blockedCount, allowedCount, searchVerified };
  console.log("\n\n=== FINAL REPORT ===");
  console.log(JSON.stringify(report, null, 2));

  console.log("\n\n=== SUMMARY ===");
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.step}${r.status !== undefined ? ` (status ${r.status})` : ""}`);
  }
}

main().catch((error) => {
  console.error("verify-policy-engine failed:", error);
  process.exitCode = 1;
});
