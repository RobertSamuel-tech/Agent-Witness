import { executeSql, getBoolean, getNumber, getString, textParam } from "@/lib/db";
import type { PlanType } from "@/lib/db/types";

const REQUIRED_TABLES = ["tenants", "agents", "policies", "agent_actions"] as const;
const RLS_TABLES = ["agents", "policies", "agent_actions"] as const;
const EMBEDDING_INDEX_NAME = "idx_actions_embedding";

type RlsTableName = (typeof RLS_TABLES)[number];

function isRlsTable(name: string): name is RlsTableName {
  return (RLS_TABLES as readonly string[]).includes(name);
}

/**
 * Canonical schema, mirrored from lib/db/schema.sql but split into individual
 * idempotent statements. The RDS Data API's ExecuteStatement only accepts one
 * SQL statement per call, so each top-level statement (including DO blocks)
 * is executed separately.
 */
const SCHEMA_STATEMENTS: { label: string; sql: string }[] = [
  {
    label: "CREATE EXTENSION vector",
    sql: `CREATE EXTENSION IF NOT EXISTS vector`,
  },
  {
    label: "CREATE TABLE tenants",
    sql: `CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      plan VARCHAR(20) NOT NULL DEFAULT 'starter',
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
  },
  {
    label: "CREATE TABLE agents",
    sql: `CREATE TABLE IF NOT EXISTS agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      name VARCHAR(255) NOT NULL,
      framework VARCHAR(50),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
  },
  {
    label: "ENABLE RLS agents",
    sql: `ALTER TABLE agents ENABLE ROW LEVEL SECURITY`,
  },
  {
    label: "CREATE POLICY tenant_isolation ON agents",
    sql: `DO $$
    BEGIN
      DROP POLICY IF EXISTS tenant_isolation ON agents;
      CREATE POLICY tenant_isolation ON agents
        USING (
          tenant_id = COALESCE(
            NULLIF(current_setting('app.current_tenant', true), ''),
            tenant_id::text
          )::uuid
        );
    END $$`,
  },
  {
    label: "CREATE TABLE policies",
    sql: `CREATE TABLE IF NOT EXISTS policies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      rule_type VARCHAR(50) NOT NULL,
      rule_config JSONB NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
  },
  {
    label: "ENABLE RLS policies",
    sql: `ALTER TABLE policies ENABLE ROW LEVEL SECURITY`,
  },
  {
    label: "CREATE POLICY tenant_isolation ON policies",
    sql: `DO $$
    BEGIN
      DROP POLICY IF EXISTS tenant_isolation ON policies;
      CREATE POLICY tenant_isolation ON policies
        USING (
          tenant_id = COALESCE(
            NULLIF(current_setting('app.current_tenant', true), ''),
            tenant_id::text
          )::uuid
        );
    END $$`,
  },
  {
    label: "CREATE TABLE agent_actions",
    sql: `CREATE TABLE IF NOT EXISTS agent_actions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      agent_id UUID NOT NULL REFERENCES agents(id),
      action_type VARCHAR(50) NOT NULL,
      input_summary TEXT NOT NULL,
      input_metadata JSONB NOT NULL DEFAULT '{}',
      output_summary TEXT NOT NULL,
      output_metadata JSONB NOT NULL DEFAULT '{}',
      policy_id UUID,
      policy_result VARCHAR(20) NOT NULL DEFAULT 'allowed',
      cost_usd NUMERIC(10,6),
      embedding vector(1536),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
  },
  {
    label: "ENABLE RLS agent_actions",
    sql: `ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY`,
  },
  {
    label: "CREATE POLICY tenant_isolation ON agent_actions",
    sql: `DO $$
    BEGIN
      DROP POLICY IF EXISTS tenant_isolation ON agent_actions;
      CREATE POLICY tenant_isolation ON agent_actions
        USING (
          tenant_id = COALESCE(
            NULLIF(current_setting('app.current_tenant', true), ''),
            tenant_id::text
          )::uuid
        );
    END $$`,
  },
  {
    label: "CREATE INDEX idx_actions_embedding (HNSW)",
    sql: `CREATE INDEX IF NOT EXISTS idx_actions_embedding ON agent_actions
      USING hnsw (embedding vector_cosine_ops)`,
  },
  {
    label: "CREATE TABLE emergency_controls",
    sql: `CREATE TABLE IF NOT EXISTS emergency_controls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
      is_agent_execution_paused BOOLEAN NOT NULL DEFAULT false,
      reason TEXT,
      paused_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
  },
];

const DEFAULT_TENANTS: { name: string; plan: PlanType }[] = [
  { name: "Acme Corporation", plan: "enterprise" },
  { name: "Globex Industries", plan: "starter" },
];

export interface SchemaStatementResult {
  label: string;
  ok: boolean;
  error: string | null;
}

export interface SeedResult {
  seeded: boolean;
  insertedCount: number;
}

export interface ExtensionStatus {
  installed: boolean;
  version: string | null;
}

export interface TableStatus {
  name: string;
  exists: boolean;
  rowLevelSecurityEnabled: boolean | null;
  policyCount: number;
}

export interface IndexStatus {
  name: string;
  exists: boolean;
  isHnsw: boolean;
}

export interface EnvironmentReport {
  aurora: { connected: boolean; error: string | null };
  pgvector: ExtensionStatus;
  tables: TableStatus[];
  embeddingIndex: IndexStatus;
  tenantCount: number;
  ready: boolean;
}

/**
 * Executes the canonical schema statement-by-statement. Every statement is
 * idempotent (IF NOT EXISTS / guarded DO blocks), so this is safe to run
 * repeatedly against an already-bootstrapped database.
 */
export async function applySchema(): Promise<SchemaStatementResult[]> {
  const results: SchemaStatementResult[] = [];

  for (const statement of SCHEMA_STATEMENTS) {
    try {
      await executeSql(statement.sql);
      results.push({ label: statement.label, ok: true, error: null });
    } catch (error) {
      results.push({
        label: statement.label,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Seeds default tenants only when the tenants table is empty, so repeated
 * bootstrap calls never create duplicates.
 */
export async function seedDefaultTenants(): Promise<SeedResult> {
  const rows = await executeSql(`SELECT COUNT(*) AS count FROM tenants`);
  const count = getNumber(rows[0], "count");

  if (count > 0) {
    return { seeded: false, insertedCount: 0 };
  }

  for (const tenant of DEFAULT_TENANTS) {
    await executeSql(`INSERT INTO tenants (name, plan) VALUES (:name, :plan)`, [
      textParam("name", tenant.name),
      textParam("plan", tenant.plan),
    ]);
  }

  return { seeded: true, insertedCount: DEFAULT_TENANTS.length };
}

function emptyReport(auroraError: string | null): EnvironmentReport {
  return {
    aurora: { connected: false, error: auroraError },
    pgvector: { installed: false, version: null },
    tables: REQUIRED_TABLES.map((name) => ({
      name,
      exists: false,
      rowLevelSecurityEnabled: isRlsTable(name) ? false : null,
      policyCount: 0,
    })),
    embeddingIndex: { name: EMBEDDING_INDEX_NAME, exists: false, isHnsw: false },
    tenantCount: 0,
    ready: false,
  };
}

/**
 * Reports the current readiness of the Aurora environment: connectivity,
 * pgvector availability, required tables, RLS + policy coverage, the HNSW
 * embedding index, and tenant count. Read-only — does not modify schema.
 */
export async function getEnvironmentReport(): Promise<EnvironmentReport> {
  try {
    await executeSql("SELECT 1");
  } catch (error) {
    return emptyReport(error instanceof Error ? error.message : String(error));
  }

  const [extensionRows, tableRows, rlsRows, policyRows, indexRows, tenantRows] = await Promise.all([
    executeSql(`SELECT extversion FROM pg_extension WHERE extname = 'vector'`),
    executeSql(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`),
    executeSql(
      `SELECT relname, relrowsecurity FROM pg_class WHERE relkind = 'r' AND relname IN ('agents', 'policies', 'agent_actions')`
    ),
    executeSql(`SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'`),
    executeSql(`SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = :indexName`, [
      textParam("indexName", EMBEDDING_INDEX_NAME),
    ]),
    executeSql(`SELECT COUNT(*) AS count FROM tenants`).catch(() => []),
  ]);

  const existingTables = new Set(tableRows.map((row) => getString(row, "tablename")));

  const rlsByTable = new Map<string, boolean>();
  for (const row of rlsRows) {
    rlsByTable.set(getString(row, "relname"), getBoolean(row, "relrowsecurity"));
  }

  const policyCountByTable = new Map<string, number>();
  for (const row of policyRows) {
    const tableName = getString(row, "tablename");
    policyCountByTable.set(tableName, (policyCountByTable.get(tableName) ?? 0) + 1);
  }

  const tables: TableStatus[] = REQUIRED_TABLES.map((name) => ({
    name,
    exists: existingTables.has(name),
    rowLevelSecurityEnabled: isRlsTable(name) ? rlsByTable.get(name) ?? false : null,
    policyCount: policyCountByTable.get(name) ?? 0,
  }));

  const pgvector: ExtensionStatus =
    extensionRows.length > 0
      ? { installed: true, version: getString(extensionRows[0], "extversion") }
      : { installed: false, version: null };

  const indexDef = indexRows.length > 0 ? getString(indexRows[0], "indexdef") : null;
  const embeddingIndex: IndexStatus = {
    name: EMBEDDING_INDEX_NAME,
    exists: indexDef !== null,
    isHnsw: indexDef !== null && indexDef.toLowerCase().includes("hnsw"),
  };

  const tenantCount = tenantRows.length > 0 ? getNumber(tenantRows[0], "count") : 0;

  const ready =
    pgvector.installed &&
    tables.every((table) => table.exists) &&
    RLS_TABLES.every((name) => {
      const table = tables.find((candidate) => candidate.name === name);
      return table?.rowLevelSecurityEnabled === true && table.policyCount > 0;
    }) &&
    embeddingIndex.exists &&
    embeddingIndex.isHnsw;

  return {
    aurora: { connected: true, error: null },
    pgvector,
    tables,
    embeddingIndex,
    tenantCount,
    ready,
  };
}
