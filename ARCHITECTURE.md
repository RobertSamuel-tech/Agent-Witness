# AgentWitness — System Architecture

AgentWitness is a multi-tenant AI governance platform that ingests, evaluates, stores, and audits every action taken by AI agents running inside a customer's infrastructure.

## High-Level Data Flow

```mermaid
flowchart TD
    subgraph Agents["AI Agents (Customer)"]
        A1[sales-gpt\nOpenAI]
        A2[billing-agent\nAutogen]
        A3[compliance-agent\nOpenAI]
        A4[onboarding-agent\nCrewAI]
        A5[support-bot\nLangChain]
    end

    subgraph Ingest["Next.js API — Ingest Layer"]
        I1[POST /api/ingest]
        I2[Policy Engine\ndeterministic, no LLM]
        I3[Embedder\nOpenRouter text-embedding-3-small]
    end

    subgraph Aurora["Aurora PostgreSQL (AWS)"]
        DB1[(agent_actions\npgvector HNSW index)]
        DB2[(agents)]
        DB3[(policies)]
        DB4[(emergency_controls)]
        DB5[(tenants)]
    end

    subgraph Frontend["Next.js Frontend (Vercel)"]
        F1[/dashboard/live\nLive Agent Stream]
        F2[/dashboard/anomalies\nSemantic Search]
        F3[/dashboard/risk-center\nGovernance & PDF]
        F4[/dashboard/graph\nCausal Investigation]
        F5[/dashboard/control-center\nGlobal Kill Switch]
        F6[/dashboard/threats\nThreat Timeline]
        F7[/dashboard/audit-log\nFull Audit Trail]
    end

    subgraph APIs["Next.js API — Read Layer"]
        R1[GET /api/live-events\nAurora poll, incremental]
        R2[POST /api/search\npgvector cosine similarity]
        R3[GET /api/executive\ngovernance KPIs]
        R4[POST /api/compliance/report\nPDF generation via pdfkit]
        R5[GET /api/health\nAurora + pgvector + RLS]
        R6[POST /api/simulate\nEvent generator]
    end

    Agents -->|POST action + metadata| I1
    I1 --> I2
    I2 -->|allowed / blocked / flagged| I3
    I3 -->|1536-dim vector| DB1
    I2 --> DB1
    I2 -->|check| DB3
    I1 -->|check pause state| DB4

    DB1 --> R1
    DB1 --> R2
    DB1 --> R3
    DB1 --> R4
    DB2 --> R2
    DB2 --> R3
    DB3 --> R3

    R1 --> F1
    R2 --> F2
    R3 --> F3
    R3 --> F6
    R3 --> F7
    R4 --> F3
    R5 -.->|health badge| F1
    R6 -->|test events| DB1

    F5 -->|pause/resume| DB4
```

## AWS Database Usage

AgentWitness uses **Amazon Aurora PostgreSQL** as its primary data store for all governance data.

| Feature | Implementation |
|---|---|
| Multi-tenancy | `WHERE tenant_id = :tenantId` on every query + RLS as defense-in-depth |
| Semantic search | `pgvector` extension — HNSW index (`vector_cosine_ops`) on `agent_actions.embedding` |
| Vector dimensions | 1536 (OpenAI `text-embedding-3-small` compatible) |
| Search operator | `<=>` cosine distance, ordered in-database — no client-side scan |
| Row-Level Security | `CREATE POLICY` on `agent_actions` with `app.current_tenant` session variable |
| Kill switch | `emergency_controls` table — one row per tenant, checked on every `/api/ingest` call |

### Why Aurora + pgvector, not DynamoDB

DynamoDB has no vector index type, no `ORDER BY` on a computed expression, and no operator equivalent to `<=>`. A DynamoDB-backed semantic search would require exporting every candidate row, computing cosine similarity in application code, and sorting client-side — an O(n) scan per query with no way to push ranking to the database. Aurora runs the HNSW approximate nearest-neighbor search and the RLS tenant filter in a single indexed query.

## Key Tables

```sql
-- Multi-tenant agent registry
agents          (id, tenant_id, name, framework, status)

-- Every AI action ever taken — the core audit table
agent_actions   (id, tenant_id, agent_id, action_type,
                 input_summary, input_metadata,
                 output_summary, output_metadata,
                 policy_id, policy_result, cost_usd,
                 embedding vector(1536),   -- pgvector
                 created_at)

-- Deterministic policy rules (no LLM)
policies        (id, tenant_id, rule_type, rule_config, is_active)

-- Global kill switch per tenant
emergency_controls (id, tenant_id, is_agent_execution_paused,
                    reason, paused_by, updated_at)

-- Tenant registry
tenants         (id, name, plan)
```

## Scoring Formulas

All scores are **percentage-based** to stay meaningful regardless of dataset size.

```
governance_score = 100 - (blocked/total × 100) - (flagged/total × 40)
trust_score      = 100 - (blocked/total × 120) - (flagged/total × 40)
```

## Live Stream Architecture

The Live Stream page polls `/api/live-events` every 3 seconds using an incremental `since=<ISO>` parameter. The auto-simulator fires random scenarios every 5–8 seconds and writes directly to Aurora. The poll picks up new rows via `WHERE created_at > :since`. No WebSockets, no DynamoDB, no in-memory queues.

## Health Check

`GET /api/health` verifies:
- Aurora connectivity (`SELECT 1`)
- pgvector extension (`SELECT extversion FROM pg_extension WHERE extname = 'vector'`)
- RLS policy count (`SELECT COUNT(*) FROM pg_policies WHERE tablename = 'agent_actions'`)
- Total row count (`SELECT COUNT(*) FROM agent_actions`)
- OpenRouter embedding API
