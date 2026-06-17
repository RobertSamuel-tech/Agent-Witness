/**
 * Idempotent policy seed script.
 *
 * - Fetches the first tenant from the DB (no hardcoded UUIDs)
 * - Inserts each policy only if no row with that rule_type already exists
 *   for that tenant
 * - Safe to run multiple times
 *
 * Usage:
 *   node scripts/seed-policies.mjs
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ── DB connection ──────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certPath = path.resolve(__dirname, "../global-bundle.pem");
const ca = fs.readFileSync(certPath, "utf8");

const client = new pg.Client({
  host: "database-1.cfkgku626qgk.ap-southeast-2.rds.amazonaws.com",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "Samuel2004",
  ssl: { ca, rejectUnauthorized: true },
  connectionTimeoutMillis: 10_000,
});

// ── Policy definitions ─────────────────────────────────────────────────────────
// rule_config keys must match lib/ai/policy-engine.ts:
//   cost_limit    → max_cost (number)
//   data_masking  → block_pii (boolean)
//   domain_block  → blocked_domains (string[])
//   semantic_guard → blocked_categories (string[]), threshold (number) [Phase 5]

const POLICIES = [
  {
    rule_type: "domain_block",
    rule_config: {
      blocked_domains: ["evil.com", "competitor.com", "phishing.io"],
    },
  },
  {
    rule_type: "cost_limit",
    rule_config: {
      max_cost: 5,
    },
  },
  {
    rule_type: "data_masking",
    rule_config: {
      block_pii: true,
    },
  },
  {
    rule_type: "semantic_guard",
    rule_config: {
      blocked_categories: ["violence", "adult_content", "illegal_activity"],
      threshold: 0.85,
    },
  },
];

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  await client.connect();
  console.log("Connected to Aurora.\n");

  // 1. Fetch first tenant dynamically — no hardcoded UUIDs
  const tenantResult = await client.query(
    "SELECT id, name FROM tenants ORDER BY created_at LIMIT 1"
  );
  if (tenantResult.rows.length === 0) {
    console.error("ERROR: No tenants found. Run bootstrap first.");
    process.exit(1);
  }
  const { id: tenantId, name: tenantName } = tenantResult.rows[0];
  console.log(`Using tenant: ${tenantName} (${tenantId})\n`);

  // 2. Fetch existing rule_types for this tenant
  const existingResult = await client.query(
    "SELECT rule_type FROM policies WHERE tenant_id = $1",
    [tenantId]
  );
  const existing = new Set(existingResult.rows.map((r) => r.rule_type));
  console.log(
    `Existing policies (${existing.size}): ${[...existing].join(", ") || "none"}\n`
  );

  // 3. Insert missing policies
  let inserted = 0;
  let skipped = 0;

  for (const policy of POLICIES) {
    if (existing.has(policy.rule_type)) {
      console.log(`  SKIP  ${policy.rule_type} — already exists`);
      skipped++;
      continue;
    }

    await client.query(
      `INSERT INTO policies (tenant_id, rule_type, rule_config, is_active)
       VALUES ($1, $2, $3::jsonb, true)`,
      [tenantId, policy.rule_type, JSON.stringify(policy.rule_config)]
    );
    console.log(`  INSERT ${policy.rule_type}`);
    inserted++;
  }

  console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.\n`);

  // 4. Show all policies for this tenant after seeding
  const allResult = await client.query(
    `SELECT id, rule_type, rule_config, is_active, created_at
     FROM policies
     WHERE tenant_id = $1
     ORDER BY created_at`,
    [tenantId]
  );

  console.log(`=== ALL POLICIES FOR ${tenantName} (${allResult.rows.length} total) ===`);
  console.table(
    allResult.rows.map((r) => ({
      id: r.id,
      rule_type: r.rule_type,
      rule_config: JSON.stringify(r.rule_config),
      is_active: r.is_active,
      created_at: r.created_at,
    }))
  );

  await client.end();
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
