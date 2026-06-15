/**
 * Phase 8A — Live API verification.
 *
 * Exercises the running dev server (http://localhost:3000) end-to-end
 * against the live PostgreSQL instance configured via DATABASE_URL, and
 * prints a report. Read-only except for inserting one verification `agents`
 * row (required because seedDefaultTenants only seeds `tenants`, and
 * /api/ingest requires an existing agent) and the agent_actions row created
 * by /api/ingest.
 *
 * Run with: node scripts/verify-system.ts
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

async function main(): Promise<void> {
  // STEP 1: GET /api/health
  {
    const res = await fetch(`${BASE_URL}/api/health`);
    const body = await res.json();
    record("STEP 1: GET /api/health", res.status === 200 && body.status === "ok", body, res.status);
  }

  // STEP 2: GET /api/bootstrap
  {
    const res = await fetch(`${BASE_URL}/api/bootstrap`);
    const body = await res.json();
    record("STEP 2: GET /api/bootstrap", res.status === 200 && body.ready === true, body, res.status);
  }

  // STEP 3: POST /api/setup (route does not exist in this codebase)
  {
    const res = await fetch(`${BASE_URL}/api/setup`, { method: "POST" });
    const text = await res.text();
    record("STEP 3: POST /api/setup", res.status === 404, { status: res.status, body: text.slice(0, 200) }, res.status);
  }

  // STEP 4: GET /api/setup (route does not exist in this codebase)
  {
    const res = await fetch(`${BASE_URL}/api/setup`);
    const text = await res.text();
    record("STEP 4: GET /api/setup", res.status === 404, { status: res.status, body: text.slice(0, 200) }, res.status);
  }

  // Prerequisite: insert a verification agent (agents table is empty after
  // bootstrap; seedDefaultTenants only seeds `tenants`, not `agents`).
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let tenantId: string;
  let agentId: string;
  try {
    const tenantRows = await pool.query("SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1");
    if (tenantRows.rows.length === 0) {
      throw new Error("No tenants found — run /api/bootstrap first");
    }
    tenantId = tenantRows.rows[0].id;

    const agentRows = await pool.query(
      `INSERT INTO agents (tenant_id, name, framework, status) VALUES ($1, $2, $3, 'active') RETURNING id`,
      [tenantId, "verify-system agent", "verification-script"]
    );
    agentId = agentRows.rows[0].id;
    record("PREREQ: insert verification agent", true, { tenantId, agentId });
  } finally {
    // pool stays open for STEP 8 queries below
  }

  // STEP 5: POST /api/ingest
  {
    const res = await fetch(`${BASE_URL}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
      body: JSON.stringify({
        agentId,
        actionType: "llm_call",
        inputSummary: "User requested customer export",
        outputSummary: "Exported customer records to CSV",
        costUsd: 1.25,
      }),
    });
    const body = await res.json();
    record("STEP 5: POST /api/ingest", res.status === 200, body, res.status);
  }

  // STEP 6: POST /api/search
  {
    const res = await fetch(`${BASE_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
      body: JSON.stringify({ query: "bulk customer export" }),
    });
    const body = await res.json();
    record("STEP 6: POST /api/search", res.status === 200, body, res.status);
  }

  // STEP 7: GET /api/policies
  {
    const res = await fetch(`${BASE_URL}/api/policies`, {
      headers: { "x-tenant-id": tenantId },
    });
    const body = await res.json();
    record("STEP 7: GET /api/policies", res.status === 200, body, res.status);
  }

  // STEP 8: SQL verification queries
  try {
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM tenants) AS tenants,
        (SELECT COUNT(*) FROM agents) AS agents,
        (SELECT COUNT(*) FROM policies) AS policies,
        (SELECT COUNT(*) FROM agent_actions) AS agent_actions,
        (SELECT COUNT(*) FROM agent_actions WHERE embedding IS NOT NULL) AS agent_actions_with_embedding
    `);
    record("STEP 8: SQL verification queries", true, counts.rows[0]);
  } finally {
    await pool.end();
  }

  // Final report
  console.log("\n\n=== SUMMARY REPORT ===");
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.step}${r.status !== undefined ? ` (status ${r.status})` : ""}`);
  }
}

main().catch((error) => {
  console.error("verify-system failed:", error);
  process.exitCode = 1;
});
