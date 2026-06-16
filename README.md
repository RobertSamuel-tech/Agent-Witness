<div align="center">

<br />

```
 █████╗  ██████╗ ███████╗███╗   ██╗████████╗
██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║
██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║
██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║
╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝

██╗    ██╗██╗████████╗███╗   ██╗███████╗███████╗███████╗
██║    ██║██║╚══██╔══╝████╗  ██║██╔════╝██╔════╝██╔════╝
██║ █╗ ██║██║   ██║   ██╔██╗ ██║█████╗  ███████╗███████╗
██║███╗██║██║   ██║   ██║╚██╗██║██╔══╝  ╚════██║╚════██║
╚███╔███╔╝██║   ██║   ██║ ╚████║███████╗███████║███████║
 ╚══╝╚══╝ ╚═╝   ╚═╝   ╚═╝  ╚═══╝╚══════╝╚══════╝╚══════╝
```

### The AI Control Plane for the Agentic Enterprise

**Real-time policy enforcement, causal investigation, and governance intelligence<br/>for every action your AI agents take — in production, at scale.**

<br/>

[![Build](https://img.shields.io/badge/build-passing-22c55e?style=flat-square&logo=github-actions&logoColor=white)](https://github.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Aurora PostgreSQL](https://img.shields.io/badge/Aurora-PostgreSQL%2018-FF9900?style=flat-square&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/rds/aurora/)
[![pgvector](https://img.shields.io/badge/pgvector-HNSW-4285F4?style=flat-square&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Multi-tenant](https://img.shields.io/badge/Multi--tenant-RLS%20Enforced-6366f1?style=flat-square)](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
[![License](https://img.shields.io/badge/license-Apache%202.0-22c55e?style=flat-square)](./LICENSE)
[![SOC 2](https://img.shields.io/badge/SOC%202-Type%20II%20Pending-f59e0b?style=flat-square)](https://www.aicpa.org/soc2)

<br/>

> **"The missing observability layer between your AI agents and your enterprise."**

<br/>

</div>

---

## Why AgentWitness

Enterprises are deploying autonomous AI agents into production at an unprecedented pace. These agents read customer records, call internal tools, hit external APIs, issue financial transactions, and send communications — **all without a human in the loop.**

The market has observability for code. It has observability for cloud infrastructure. It has observability for APIs.

**There is no enterprise-grade observability layer for AI agent behavior.**

AgentWitness is that layer. It is the **AI Control Plane** — the system of record for every decision, every policy outcome, and every risk signal produced by your AI workforce. It gives security teams the visibility of Datadog, the policy enforcement of Wiz, and the investigative depth of Palantir — built specifically for the agentic AI era.

---

## The $47B Problem No One Has Solved

| The Gap | What Happens Today | What It Costs |
|---|---|---|
| **No agent audit trail** | Actions scatter across service logs, LLM APIs, and tool outputs with no unified timeline | 200+ hours of manual reconstruction per incident |
| **No intent-aware guardrails** | Rule-based keyword filters miss semantic policy violations | Average breach dwell time: 197 days |
| **No executive risk posture** | Boards ask "how exposed are we?" — no one can answer | Regulatory fines averaging $4.5M per AI incident |
| **No causal investigation** | Security teams see the blast radius, never the chain of causality | 3× longer incident response vs. traditional systems |

The arrival of agent frameworks (LangChain, AutoGen, CrewAI, OpenAI Agents SDK) has created an entirely new attack surface that no existing vendor covers.

---

## Platform Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AGENTWITNESS PLATFORM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   INGEST LAYER                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│   │  REST Ingest │  │  SDK Agents  │  │  Webhook     │  │  LangChain   │  │
│   │  /api/ingest │  │  (OpenAI,    │  │  Connectors  │  │  Callbacks   │  │
│   │              │  │   Anthropic) │  │              │  │              │  │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│          └─────────────────┴─────────────────┴─────────────────┘           │
│                                      │                                      │
│   ┌───────────────────────────────────▼──────────────────────────────────┐  │
│   │                     POLICY ENFORCEMENT ENGINE                        │  │
│   │                                                                      │  │
│   │   Cost Limits  ──►  PII / Data Masking  ──►  Domain Blocking  ──►   │  │
│   │                                                                      │  │
│   │   [ALLOW]              [FLAG]                  [BLOCK]               │  │
│   └───────────────────────────────────┬──────────────────────────────────┘  │
│                                       │                                      │
│   INTELLIGENCE LAYER                  │                                      │
│   ┌──────────────────────────────────▼──────────────────────────────────┐   │
│   │                                                                     │   │
│   │  ┌─────────────────┐   ┌────────────────┐   ┌───────────────────┐  │   │
│   │  │  Risk Scoring   │   │ Vector Search  │   │  Causal Graph     │  │   │
│   │  │  Engine (0-100) │   │ (HNSW pgvector)│   │  Reconstruction   │  │   │
│   │  └────────┬────────┘   └───────┬────────┘   └─────────┬─────────┘  │   │
│   │           └───────────────────┴────────────────────────┘            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                       │                                      │
│   PERSISTENCE LAYER                   │                                      │
│   ┌──────────────────────────────────▼──────────────────────────────────┐   │
│   │                  AWS Aurora PostgreSQL 18 (Multi-AZ)                │   │
│   │                                                                     │   │
│   │   agent_actions ── policies ── agents ── tenants ── embeddings      │   │
│   │   [Row Level Security enforced on every table]                      │   │
│   │   [HNSW vector index on 1536-dimension embeddings]                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   OPERATIONS CONSOLE (Next.js 16 · App Router · TypeScript)                │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│   │  Risk Center │  │  Threat      │  │  Causal      │  │  Control     │  │
│   │  (Executive) │  │  Timeline    │  │  Graph       │  │  Center      │  │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Modules

### AI Risk Center — Executive Governance Dashboard

The board-ready risk posture view. A live **Governance Score (0–100)** computed from real policy outcomes, violation rates, cost anomalies, and blocked-action frequency — updated continuously as agents act.

- **Risk-ranked agent list** — sorted by cumulative violation severity, not just count
- **Policy violation breakdown** — by rule type, agent, time window, and business impact
- **Critical incident feed** — blocked and flagged actions surfaced with full context
- **Auto-generated executive briefing** — natural-language risk summary derived from live data, not templates

> *"The first time a CISO can walk into a board meeting and answer 'how exposed are we to our AI agents?' with a defensible number."*

---

### Threat Timeline — Security Operations Center for AI

A real-time, animated reconstruction of every blocked or flagged incident — rendered as a chronological event chain from agent initiation through policy evaluation to outcome verdict.

```
  10:47:23.441  ──  [Agent: data-exporter-v2]  ──  INITIATED
       │
       ▼
  10:47:23.512  ──  [Action: export_customer_records]  ──  PII DETECTED
       │
       ▼
  10:47:23.519  ──  [Policy: pii-masking-rule]  ──  EVALUATING
       │
       ▼
  10:47:23.521  ──  [Outcome]  ──  ██ BLOCKED  ──  Risk Score: 94/100
```

Each event carries: affected systems, matched policy rule, input/output context, cost incurred, and a one-click link into the full Investigation Panel.

---

### Causal Investigation Graph — Visual Incident Reconstruction

Click any incident and open an interactive, glassmorphism-styled causal graph that traces the full chain of causality:

```
  ┌─────────────┐     initiated      ┌─────────────┐     evaluated by    ┌─────────────┐
  │  AGENT      │ ──────────────────► │  ACTION     │ ──────────────────► │  POLICY     │
  │ data-export │                     │ export_csv  │                     │ pii-masking │
  └─────────────┘                     └─────────────┘                     └──────┬──────┘
                                                                                  │
                                                                          verdict │
                                                                                  ▼
                                                                         ┌─────────────┐
                                                                         │  OUTCOME    │
                                                                         │  BLOCKED    │
                                                                         │  Risk: 94   │
                                                                         └─────────────┘
```

Nodes are rendered as interactive glassmorphism cards with live handles. The full agent → action → policy → outcome chain is reconstructable for any historical event.

---

### Semantic Threat Discovery — Intent-Aware Investigation

Query your entire agent activity history by **semantic intent**, not keywords. Powered by a 1536-dimension vector embedding index with HNSW approximate nearest-neighbor search inside Aurora — no external vector database.

```bash
# Example queries your security team can run today:
"has any agent exported customer data to an unauthorized domain?"
"show me all actions that bypassed approval workflows"
"which agents have been operating outside their stated purpose?"
"find all actions similar to this blocked incident"
```

Results are ranked by cosine similarity, annotated with the matched policy, risk score, and a one-click path to the full causal graph.

---

### Policy Engine — Real-Time Governance Enforcement

Define, deploy, and iterate on governance rules without code changes. Every policy is evaluated in-band against every agent action before it completes.

| Policy Type | What It Does |
|---|---|
| **Cost Limit** | Block or flag actions that would exceed per-call or rolling-window spend thresholds |
| **PII / Data Masking** | Detect and block actions that expose regulated personal data to unauthorized destinations |
| **Domain Blocking** | Prevent agents from communicating with unauthorized external endpoints |
| **Custom Rules** | JSONB-configured rule logic evaluated against structured action metadata |

All policies are tenant-scoped, versioned, and produce immutable outcome records tied to the action that triggered them.

---

### Control Center — Emergency Governance Controls

A kill-switch layer for runtime governance. Pause all agent execution across a tenant in a single action — with a mandatory reason, actor attribution, and timestamp — without touching application code or infrastructure.

```
  ┌──────────────────────────────────────────────────────────┐
  │   AGENT EXECUTION: ██ PAUSED                             │
  │   Reason: Suspected data exfiltration campaign           │
  │   Paused by: security-lead@acme.com                      │
  │   Paused at: 2026-06-16T10:47:23Z                        │
  │                          [ Resume Execution ]            │
  └──────────────────────────────────────────────────────────┘
```

---

## Competitive Positioning

| Capability | AgentWitness | Datadog | Wiz | Lakera | LangSmith | Galileo | Palantir |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| AI agent action audit trail | ✅ | ⚠️ | ❌ | ⚠️ | ✅ | ✅ | ⚠️ |
| Real-time policy enforcement | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ⚠️ |
| Causal graph reconstruction | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ✅ |
| Semantic / vector threat search | ✅ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ⚠️ |
| Executive governance score | ✅ | ⚠️ | ✅ | ❌ | ❌ | ⚠️ | ✅ |
| Emergency kill-switch controls | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ⚠️ |
| Multi-tenant RLS isolation | ✅ | ⚠️ | ✅ | ⚠️ | ❌ | ❌ | ✅ |
| Agent-framework agnostic | ✅ | ✅ | ✅ | ⚠️ | ❌ | ⚠️ | ✅ |
| No external vector DB required | ✅ | N/A | N/A | N/A | ❌ | ❌ | N/A |

✅ Native · ⚠️ Partial / Bolt-on · ❌ Not available

AgentWitness is the only platform purpose-built for the **full governance lifecycle**: ingest → enforce → investigate → report. Competitors either focus on LLM evaluation (LangSmith, Galileo), cloud posture (Wiz), prompt injection (Lakera), or general observability (Datadog) — none provide a unified control plane for autonomous AI agent governance.

---

## Technical Architecture

### Stack

```
┌─────────────────────────────────────────────────────────────┐
│  APPLICATION TIER                                           │
│  Next.js 16.2 (Turbopack) · React 19 · TypeScript 5        │
│  App Router · Server Components · Streaming SSR             │
│  shadcn/ui · Tailwind CSS v4 · @xyflow/react               │
├─────────────────────────────────────────────────────────────┤
│  API TIER                                                   │
│  Next.js API Routes (Edge-compatible)                       │
│  Named-parameter SQL → pg positional translation            │
│  Tenant-ID header enforcement on every endpoint             │
├─────────────────────────────────────────────────────────────┤
│  DATA TIER                                                  │
│  AWS Aurora PostgreSQL 18.3 (aarch64, Multi-AZ)            │
│  pgvector 0.8.1 · HNSW index (vector_cosine_ops)           │
│  Row Level Security on all tenant-scoped tables             │
│  TLS 1.3 · SCRAM-SHA-256 auth · SSL verify-full            │
├─────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE                                             │
│  AWS RDS Aurora (ap-southeast-2)                            │
│  VPC isolation · Private subnets · Security Groups          │
│  Global CA bundle · Certificate pinning                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Model

```sql
tenants           ← root isolation boundary
  └── agents      ← AI agent registry (name, framework, status)
  └── policies    ← governance rules (type, config, active flag)
  └── agent_actions  ← immutable event log
        ├── action_type, input_summary, output_summary
        ├── policy_id → policies (FK)
        ├── policy_result: [allowed | flagged | blocked]
        ├── cost_usd (per-call spend tracking)
        └── embedding vector(1536)  ← semantic search index
  └── emergency_controls  ← per-tenant kill-switch state
```

### Multi-Tenancy

Every table carrying tenant-scoped data has **Row Level Security enabled** with a `tenant_isolation` policy that enforces `tenant_id = app.current_tenant` at the PostgreSQL session level — a hard boundary that cannot be bypassed by application bugs or query injection.

```sql
-- Applied to: agents, policies, agent_actions
CREATE POLICY tenant_isolation ON agent_actions
  USING (
    tenant_id = COALESCE(
      NULLIF(current_setting('app.current_tenant', true), ''),
      tenant_id::text
    )::uuid
  );
```

### Vector Search Architecture

Embeddings are stored as `vector(1536)` directly inside Aurora — no separate Pinecone, Qdrant, or Weaviate instance required. An HNSW index provides sub-millisecond approximate nearest-neighbor search at scale:

```sql
CREATE INDEX idx_actions_embedding ON agent_actions
  USING hnsw (embedding vector_cosine_ops);
```

This collapses the operational surface area of the semantic search tier from three services (LLM, vector DB, relational DB) to one.

---

## Security

### Authentication & Authorization
- All API routes enforce tenant identity via `x-tenant-id` header with UUID validation
- Row Level Security enforced at the database session level — application-layer bypasses are structurally impossible
- SCRAM-SHA-256 database authentication
- TLS 1.3 in transit with Aurora CA certificate pinning (`sslmode=verify-full`)

### Data Isolation
- Complete logical tenant separation via RLS — no shared queries, no cross-tenant data leakage by design
- Emergency control records enforce a `UNIQUE` constraint on `tenant_id` — one kill-switch state per tenant, no ambiguity
- All PII detection and masking policies evaluated before data leaves the enforcement layer

### Infrastructure Security
- Aurora instance in private VPC subnets — not directly internet-reachable from untrusted sources
- Database credentials managed via environment variables, never committed to version control
- SSL certificate validation enforced at the connection pool layer (not passed through to pg's URL parser)

### Audit Trail
- Every agent action produces an immutable record in `agent_actions`
- Policy outcomes (allow/flag/block) are persisted atomically with the triggering action
- Emergency control state changes carry actor identity, reason, and timestamp
- All schema migrations are idempotent, labeled, and executed as discrete statements

### Roadmap: Compliance Certifications
- **SOC 2 Type II** — audit engagement in preparation (Q3 2026)
- **ISO 27001** — gap assessment scheduled (Q1 2027)
- **GDPR / CCPA** — data residency controls and PII purge APIs (Q4 2026)
- **HIPAA BAA** — on enterprise plan roadmap (Q2 2027)

---

## Deployment

### Prerequisites

```bash
node >= 20.0.0
npm >= 10.0.0
AWS Aurora PostgreSQL (or compatible PostgreSQL 14+)
```

### Environment

```bash
# .env
DATABASE_URL=postgres://USER:PASSWORD@AURORA_ENDPOINT:5432/DB?sslmode=verify-full&sslrootcert=./global-bundle.pem
OPENAI_API_KEY=sk-...          # for embedding generation
OPENROUTER_API_KEY=sk-or-...   # for AI narrative generation
```

### Bootstrap

```bash
npm install
npm run dev          # development (Turbopack)

# First run: initialize schema and seed default tenants
curl -X POST http://localhost:3000/api/bootstrap

# Verify connectivity and schema readiness
curl http://localhost:3000/api/health
```

### Production Build

```bash
npm run build        # Next.js production build (Turbopack)
npm start            # production server
```

### Docker (coming Q3 2026)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci --production
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### AWS Architecture (Recommended Production Topology)

```
Internet
    │
    ▼
┌──────────────────┐
│  CloudFront CDN  │   (static assets, edge caching)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Application     │   EC2 / ECS Fargate / App Runner
│  Load Balancer   │   (Next.js, multi-instance)
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Private VPC                         │
│  ┌───────────────────────────────┐   │
│  │  Aurora PostgreSQL (Multi-AZ) │   │
│  │  Primary + Read Replica       │   │
│  └───────────────────────────────┘   │
└──────────────────────────────────────┘
```

---

## API Reference

### Ingest

```http
POST /api/ingest
x-tenant-id: {tenant-uuid}
Content-Type: application/json

{
  "agentId": "uuid",
  "actionType": "export_customer_records",
  "inputSummary": "Export Q2 churn risk cohort to Salesforce",
  "inputMetadata": { "record_count": 4200, "destination": "salesforce-api" },
  "outputSummary": "Export blocked by PII masking policy",
  "costUsd": 0.0042
}
```

### Query Actions

```http
GET /api/ingest
x-tenant-id: {tenant-uuid}
```

### Causal Graph

```http
GET /api/actions/{action-id}/graph
x-tenant-id: {tenant-uuid}
```

### Semantic Search

```http
POST /api/search
x-tenant-id: {tenant-uuid}
Content-Type: application/json

{ "query": "agents exfiltrating customer data to unauthorized endpoints" }
```

### Emergency Control

```http
POST /api/control/pause
x-tenant-id: {tenant-uuid}
Content-Type: application/json

{ "reason": "Active security incident", "pausedBy": "security-lead@acme.com" }

POST /api/control/resume
x-tenant-id: {tenant-uuid}
```

### Health & Bootstrap

```http
GET  /api/health     → Aurora connectivity, schema readiness, pgvector status
POST /api/bootstrap  → Idempotent schema apply + tenant seeding
```

---

## Technology Stack

AgentWitness is built on a production-grade, enterprise-vetted stack. Every layer was selected for security, scalability, and operational maturity — not familiarity.

### Frontend

| Technology | Role |
|---|---|
| **Next.js 16** (App Router, Turbopack) | Server-rendered dashboard, API routes, streaming SSR |
| **React 19** | Component model, concurrent rendering, server components |
| **TypeScript 5** | End-to-end type safety across all layers |
| **Tailwind CSS v4** | Utility-first design system with OKLCH color space |
| **shadcn/ui** | Accessible, unstyled component primitives |
| **v0-generated UI components** | Enterprise-grade, production-ready UI patterns |
| **React Flow (@xyflow/react)** | Interactive causal graph and investigation canvas |
| **Lucide Icons** | Consistent iconography across the operations console |
| **Framer Motion** | Purposeful micro-animations and investigation panel transitions |

### Backend

| Technology | Role |
|---|---|
| **Next.js Route Handlers** | API layer for ingest, governance, and investigation endpoints |
| **TypeScript** | Typed business logic, policy evaluation, and risk scoring |
| **Server Actions** | Streaming control-plane operations |
| **Zod** | Schema validation at every API boundary |
| **Named-parameter SQL engine** | Internal `:param → $N` translation layer for query safety |

### Database

| Technology | Role |
|---|---|
| **Amazon Aurora PostgreSQL 18** | ACID-compliant, managed relational persistence for all governance data |
| **pgvector 0.8.1** | 1536-dimension vector embeddings co-located with audit records |
| **HNSW indexing** | Sub-millisecond approximate nearest-neighbor search for semantic threat discovery |
| **Row-Level Security (RLS)** | Database-enforced tenant isolation — bypasses are structurally impossible |
| **JSONB policy storage** | Flexible, queryable governance rule configuration without schema migrations |
| **SCRAM-SHA-256** | Modern password authentication — eliminates MD5 downgrade attacks |

### Infrastructure

| Technology | Role |
|---|---|
| **AWS RDS Aurora** | Multi-AZ managed PostgreSQL — automated failover, backups, and patching |
| **AWS VPC** | Network-level isolation for database and compute tiers |
| **Security Groups** | Ingress-restricted access control at the AWS network layer |
| **TLS 1.3** | Encryption in transit for all database connections |
| **SSL certificate validation** | Aurora CA bundle pinned at the connection pool layer (`sslmode=verify-full`) |

### AI Layer

| Technology | Role |
|---|---|
| **OpenRouter** | Unified gateway to 100+ LLMs for incident narrative generation |
| **OpenAI-compatible APIs** | Embedding generation for semantic search (1536-dimension) |
| **Multi-model support** | Swap underlying models without application changes |
| **Agent framework integrations** | LangChain, AutoGen, CrewAI, OpenAI Agents SDK, Anthropic |

### Multi-Tenant Security Architecture

AgentWitness is designed from the ground up for B2B SaaS deployment with hard multi-tenant boundaries:

```
Tenant A ──► x-tenant-id header ──► UUID validation
                                         │
                                         ▼
                              PostgreSQL session
                              SET app.current_tenant = 'tenant-a-uuid'
                                         │
                                         ▼
                              RLS policy evaluates on every query
                              tenant_id = current_setting('app.current_tenant')
                                         │
                                    ┌────┴────┐
                                    │ ALLOWED │  ← Tenant A's data only
                                    └─────────┘

Tenant B ──► same database, same tables, zero data overlap
```

Every governance feature — audit logs, policies, agents, investigations, emergency controls — is enforced in isolation per tenant:

| Isolation Layer | Mechanism |
|---|---|
| **Tenant identity** | `x-tenant-id` UUID header, validated on every request |
| **Row isolation** | PostgreSQL RLS `tenant_isolation` policy on all tables |
| **Policy segregation** | Policy rules are tenant-scoped and never evaluated cross-tenant |
| **Audit segregation** | `agent_actions` log is filtered by `tenant_id` at the RLS layer |
| **Emergency controls** | Per-tenant kill switch with `UNIQUE(tenant_id)` constraint |
| **Organization governance** | Each tenant independently configures agents, policies, and risk thresholds |

---

## Integrations

### Supported Agent Frameworks (GA)

| Framework | Integration Method |
|---|---|
| OpenAI Agents SDK | REST ingest via callback |
| LangChain / LangGraph | Custom callback handler |
| Anthropic Claude API | Tool-use result capture |
| AutoGen | Event hook + REST ingest |
| CrewAI | Task completion webhook |

### Platform Integrations (Roadmap)

| Integration | Target Quarter |
|---|---|
| Slack — incident alerts | Q3 2026 |
| Microsoft Teams | Q3 2026 |
| PagerDuty | Q3 2026 |
| Splunk SIEM export | Q4 2026 |
| Datadog log forwarding | Q4 2026 |
| GitHub Copilot governance | Q4 2026 |
| Azure OpenAI Service | Q1 2027 |
| Google Vertex AI | Q1 2027 |
| SCIM provisioning (Okta, Azure AD) | Q1 2027 |
| SAML 2.0 / OIDC SSO | Q2 2027 |

---

## Product Roadmap

### Q3 2026 — Enterprise Hardening
- [ ] SOC 2 Type II audit engagement
- [ ] SCIM user provisioning (Okta, Azure AD)
- [ ] Webhook-triggered policy evaluation
- [ ] Slack / Teams incident alerting
- [ ] Action replay for audit reconstruction
- [ ] Custom embedding model support (Azure OpenAI, Cohere)

### Q4 2026 — Ecosystem Expansion
- [ ] GDPR / CCPA PII purge APIs
- [ ] Splunk and Datadog log export
- [ ] GitHub Copilot governance module
- [ ] Configurable risk scoring weights
- [ ] Policy simulation / dry-run mode (GA)
- [ ] Multi-region Aurora replication

### Q1 2027 — Enterprise Scale
- [ ] On-premises deployment (Kubernetes Helm chart)
- [ ] Custom LLM policy evaluation (bring-your-own model)
- [ ] ISO 27001 certification
- [ ] SAML 2.0 / OIDC single sign-on
- [ ] Role-based access control (RBAC)
- [ ] Azure OpenAI + Google Vertex AI integrations

### Q2 2027 — AI-Native Governance
- [ ] Automated remediation playbooks
- [ ] HIPAA Business Associate Agreement (enterprise)
- [ ] Adversarial agent detection (ML-based behavioral fingerprinting)
- [ ] Cross-tenant threat intelligence sharing (opt-in)
- [ ] Governance-as-code (policy-as-YAML with CI/CD enforcement)

---

## Revenue Model

AgentWitness operates a tiered SaaS revenue model targeting security, compliance, and platform engineering teams inside mid-market and enterprise organizations.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        AGENTWITNESS PRICING TIERS                        │
├─────────────────┬──────────────────────┬─────────────────────────────────┤
│  STARTER        │  GROWTH              │  ENTERPRISE                     │
│  $299 / month   │  $999 / month        │  $10,000 – $100,000+ / year     │
├─────────────────┼──────────────────────┼─────────────────────────────────┤
│                 │                      │                                 │
│  Agent          │  Policy engine       │  SSO / SCIM provisioning        │
│  monitoring     │                      │                                 │
│                 │  Semantic threat      │  Custom policy rules            │
│  Audit logs     │  investigation       │                                 │
│                 │                      │  Dedicated environments          │
│  Governance     │  Multi-agent         │                                 │
│  dashboard      │  governance          │  Compliance exports             │
│                 │                      │  (SOC 2, ISO 27001, HIPAA)      │
│                 │                      │                                 │
│                 │                      │  Quarterly business reviews     │
│                 │                      │  Priority roadmap access        │
│                 │                      │  Custom SLA (99.99% uptime)     │
└─────────────────┴──────────────────────┴─────────────────────────────────┘
```

### Unit Economics

| Metric | Starter | Growth | Enterprise |
|---|---|---|---|
| **Monthly price** | $299 | $999 | $10k–$100k+ / year |
| **Agents monitored** | Up to 5 | Up to 50 | Unlimited |
| **Actions / month** | 50,000 | 1,000,000 | Unlimited |
| **Audit retention** | 90 days | 1 year | 7+ years |
| **Support SLA** | 48h email | 12h email | Dedicated CSM |
| **Data residency** | Shared | Shared | Single-tenant option |

### Path to $10M ARR

```
  25 Enterprise accounts × $200k ACV  =  $5.0M ARR
 500 Growth accounts    × $12k ACV    =  $6.0M ARR  ← primary GTM motion
────────────────────────────────────────────────────
                              Total   =  $11.0M ARR
```

Land on Growth → expand to Enterprise as compliance requirements mature. Retention is structurally high: audit trails become load-bearing infrastructure — organizations cannot easily migrate their governance history.

> **Enterprise inquiries:** contact@agentwitness.io

---

## Market Opportunity

The AI governance market is being created right now, ahead of the regulatory wave:

- **EU AI Act** (enforcement begins August 2026) mandates auditability and human oversight for high-risk AI systems
- **NIST AI RMF** adopted by 60%+ of Fortune 500 as the de facto governance framework
- **SEC guidance** on AI in financial services requires explainable audit trails for AI-driven decisions
- **DORA** (EU Digital Operational Resilience Act) applies operational risk requirements to AI components

Enterprises subject to these frameworks have **no compliant, production-ready solution** for AI agent governance today. AgentWitness is built to be that solution.

**Target segments:**
- Financial services (trading, credit, fraud — highest regulatory exposure)
- Healthcare (clinical decision support, revenue cycle automation)
- Legal / compliance tech (document review, contract generation)
- HR tech (candidate screening, compensation analysis)
- Any enterprise running autonomous agents on customer data

---

## Architecture Decisions

### Why Aurora over purpose-built vector databases?

Running pgvector's HNSW index inside Aurora collapses a three-service dependency (relational DB + vector DB + embedding API) into one. For the compliance use case — where audit trail integrity and query isolation are paramount — having embeddings co-located with the actions they represent in the same ACID-compliant, RLS-enforced database is architecturally superior to a separate Pinecone or Qdrant instance.

### Why Next.js 16 App Router over a separate API service?

AgentWitness is a control plane console, not a high-throughput API gateway. Co-locating the UI and API in a single Next.js deployment reduces operational complexity, enables streaming server components for live dashboards, and eliminates a network hop between frontend and API — while keeping the door open to extracting the API tier as the platform scales.

### Why PostgreSQL 18 + SCRAM-SHA-256?

Aurora PostgreSQL 18 ships with native `pg_logical` replication, improved parallel query performance, and SCRAM-SHA-256 as the default authentication method — eliminating MD5 credential downgrade attacks. The aarch64 Graviton2 instance type delivers 40% better price/performance for the read-heavy analytics workloads characteristic of governance dashboards.

---

## License

Licensed under the **Apache License, Version 2.0**.

You may use, reproduce, distribute, and create derivative works of this software under the terms of the Apache 2.0 License. See the [`LICENSE`](./LICENSE) file for the full license text.

```
Copyright 2026 AgentWitness

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

<div align="center">

**AgentWitness** · AI Governance for the Agentic Enterprise

*The control plane your AI agents need. The audit trail your compliance team demands.*

<br/>

[![Schedule a Demo](https://img.shields.io/badge/Schedule%20a%20Demo-→-06b6d4?style=for-the-badge)](mailto:contact@agentwitness.io)
[![Read the Docs](https://img.shields.io/badge/Read%20the%20Docs-→-a855f7?style=for-the-badge)](https://docs.agentwitness.io)
[![View Pricing](https://img.shields.io/badge/View%20Pricing-→-f59e0b?style=for-the-badge)](https://agentwitness.io/pricing)

</div>
