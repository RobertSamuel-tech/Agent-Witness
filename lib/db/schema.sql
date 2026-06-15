-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Tenants (Multi-tenancy root)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(20) NOT NULL DEFAULT 'starter',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Agents (Who is doing the work)
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    framework VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- RLS is defense-in-depth only; primary tenant isolation is enforced via
-- explicit `WHERE tenant_id = :tenantId` predicates in lib/db/queries.ts.
-- When app.current_tenant is unset, this policy is a no-op (always true)
-- rather than raising "unrecognized configuration parameter", since pg.Pool
-- does not guarantee SET and subsequent queries share a connection.
DO $$
BEGIN
    DROP POLICY IF EXISTS tenant_isolation ON agents;
    CREATE POLICY tenant_isolation ON agents
        USING (
            tenant_id = COALESCE(
                NULLIF(current_setting('app.current_tenant', true), ''),
                tenant_id::text
            )::uuid
        );
END $$;

-- 3. Policies (The Rules)
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    rule_type VARCHAR(50) NOT NULL, -- 'cost_limit', 'data_masking', 'domain_block'
    rule_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    DROP POLICY IF EXISTS tenant_isolation ON policies;
    CREATE POLICY tenant_isolation ON policies
        USING (
            tenant_id = COALESCE(
                NULLIF(current_setting('app.current_tenant', true), ''),
                tenant_id::text
            )::uuid
        );
END $$;

-- 4. Audit Trail (The Beast + pgvector)
CREATE TABLE IF NOT EXISTS agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    agent_id UUID NOT NULL REFERENCES agents(id),
    action_type VARCHAR(50) NOT NULL, -- 'llm_call', 'tool_use', 'data_access'
    input_summary TEXT NOT NULL,
    input_metadata JSONB NOT NULL DEFAULT '{}',
    output_summary TEXT NOT NULL,
    output_metadata JSONB NOT NULL DEFAULT '{}',
    policy_id UUID,
    policy_result VARCHAR(20) NOT NULL DEFAULT 'allowed',
    cost_usd NUMERIC(10,6),
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    DROP POLICY IF EXISTS tenant_isolation ON agent_actions;
    CREATE POLICY tenant_isolation ON agent_actions
        USING (
            tenant_id = COALESCE(
                NULLIF(current_setting('app.current_tenant', true), ''),
                tenant_id::text
            )::uuid
        );
END $$;

-- The pgvector HNSW Index (Crucial for the demo)
CREATE INDEX IF NOT EXISTS idx_actions_embedding ON agent_actions
    USING hnsw (embedding vector_cosine_ops);
