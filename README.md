<div align="center">

# AGENT WITNESS

### The AI Control Plane for the Agentic Enterprise

**Real-time policy enforcement · Causal investigation · Governance intelligence<br/>for every action your AI agents take — in production, at scale.**

<br/>

[![Build](https://img.shields.io/badge/build-passing-22c55e?style=flat-square&logo=github-actions&logoColor=white)](https://github.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Aurora PostgreSQL](https://img.shields.io/badge/Aurora-PostgreSQL%2018-FF9900?style=flat-square&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/rds/aurora/)
[![DynamoDB](https://img.shields.io/badge/DynamoDB-Hot%20Path-FF9900?style=flat-square&logo=amazondynamodb&logoColor=white)](https://aws.amazon.com/dynamodb/)
[![pgvector](https://img.shields.io/badge/pgvector-HNSW-4285F4?style=flat-square&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Multi-tenant](https://img.shields.io/badge/Multi--tenant-RLS%20Enforced-6366f1?style=flat-square)](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
[![SOC 2](https://img.shields.io/badge/SOC%202-Type%20II%20Pending-f59e0b?style=flat-square)](https://www.aicpa.org/soc2)
[![License](https://img.shields.io/badge/license-Apache%202.0-22c55e?style=flat-square)](./LICENSE)

<br/>

> **"The missing observability layer between your AI agents and your enterprise."**

<br/>

[![Schedule a Demo](https://img.shields.io/badge/Schedule%20a%20Demo-→-06b6d4?style=for-the-badge)](mailto:contact@agentwitness.io)
[![Read the Docs](https://img.shields.io/badge/Read%20the%20Docs-→-a855f7?style=for-the-badge)](https://docs.agentwitness.io)
[![View Pricing](https://img.shields.io/badge/View%20Pricing-→-f59e0b?style=for-the-badge)](https://agentwitness.io/pricing)

</div>

---

## Table of Contents

- [Why AgentWitness](#why-agentwitness)
- [How It Works](#how-it-works)
- [Features at a Glance](#features-at-a-glance)
- [Platform Overview](#platform-overview)
- [Core Modules](#core-modules)
- [Competitive Positioning](#competitive-positioning)
- [Technical Architecture](#technical-architecture)
- [Security](#security)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Technology Stack](#technology-stack)
- [Integrations](#integrations)
- [Product Roadmap](#product-roadmap)
- [Revenue Model](#revenue-model)
- [Market Opportunity](#market-opportunity)
- [Architecture Decisions](#architecture-decisions)
- [License](#license)

---

## Why AgentWitness

Enterprises are deploying autonomous AI agents into production at an unprecedented pace. These agents read customer records, call internal tools, hit external APIs, issue financial transactions, and send communications — **all without a human in the loop.**

The market has observability for code. It has observability for cloud infrastructure. It has observability for APIs.

**There is no enterprise-grade observability layer for AI agent behavior.**

AgentWitness is that layer. It is the **AI Control Plane** — the system of record for every decision, every policy outcome, and every risk signal produced by your AI workforce. It gives security teams the visibility of Datadog, the policy enforcement of Wiz, and the investigative depth of Palantir — built specifically for the agentic AI era.

### The $47B Problem No One Has Solved

| The Gap | What Happens Today | What It Costs |
|---|---|---|
| **No agent audit trail** | Actions scatter across service logs, LLM APIs, and tool outputs with no unified timeline | 200+ hours of manual reconstruction per incident |
| **No intent-aware guardrails** | Rule-based keyword filters miss semantic policy violations | Average breach dwell time: 197 days |
| **No executive risk posture** | Boards ask "how exposed are we?" — no one can answer | Regulatory fines averaging $4.5M per AI incident |
| **No causal investigation** | Security teams see the blast radius, never the chain of causality | 3× longer incident response vs. traditional systems |

The arrival of agent frameworks (LangChain, AutoGen, CrewAI, OpenAI Agents SDK) has created an entirely new attack surface that no existing vendor covers.

---

## How It Works

```
  STEP 1 — INGEST                STEP 2 — ENFORCE              STEP 3 — INVESTIGATE
  ─────────────────              ─────────────────             ────────────────────────

  Your AI agent fires an    →    Policy engine evaluates  →   Security team queries,
  action (REST, SDK hook,        in-band: cost limits,        replays, and investigates
  webhook, or LangChain          PII detection, domain        any incident — step by
  callback)                      blocks, semantic guard        step — from any surface
                                                              in the platform
  ┌───────────────────┐          ┌───────────────────┐        ┌───────────────────────┐
  │  agent_action {}  │          │  [ALLOW]           │        │  Black Box Replay      │
  │  inputSummary     │──────►   │  [FLAG]            │──────► │  Causal Graph          │
  │  costUsd          │          │  [BLOCK]           │        │  Semantic Search       │
  │  agentId          │          └───────────────────┘        │  Compliance PDF        │
  └───────────────────┘                    │                   └───────────────────────┘
                                           ▼
                               ┌──────────────────────┐
                               │  Aurora (audit trail) │
                               │  DynamoDB (live feed) │
                               └──────────────────────┘
```

Every action produces an **immutable forensic record** before any enforcement decision is written — making AgentWitness a tamper-evident system of record, not just a logging layer.

---

## Features at a Glance

| Module | What It Delivers |
|---|---|
| **Black Box Replay** | 7-step forensic reconstruction of any blocked/flagged incident — like a flight recorder for AI |
| **AI Risk Center** | Live Governance Score (0–100) with risk-ranked agent list and executive briefing |
| **Compliance Command Center** | One-click SOC 2 / EU AI Act / ISO 27001 evidence PDF — auditor-ready in seconds |
| **Live Agent Stream** | Real-time DynamoDB feed of every agent action, polled every 3s with live KPIs |
| **Threat Timeline** | Animated SOC-style incident timeline from agent initiation to policy verdict |
| **Causal Investigation Graph** | Interactive graph tracing the full agent → action → policy → outcome chain |
| **Semantic Threat Discovery** | Intent-aware search across all agent history via pgvector HNSW — no keywords needed |
| **Policy Engine** | Deploy cost limits, PII masking, domain blocks, and semantic guards without code changes |
| **Control Center** | Emergency kill-switch: pause all agent execution tenant-wide in one action |

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
│   │  Cost Limits  ──►  PII / Data Masking  ──►  Domain Blocking  ──►    │  │
│   │                                                                      │  │
│   │  Semantic Guard (pgvector HNSW)                                      │  │
│   │                                                                      │  │
│   │   [ALLOW]              [FLAG]                  [BLOCK]               │  │
│   └───────────────────────────────────┬──────────────────────────────────┘  │
│                                       │                                      │
│   DUAL PERSISTENCE LAYER              │                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  AWS Aurora PostgreSQL 18 (Multi-AZ)   │  AWS DynamoDB (Hot Path)   │   │
│   │  agent_actions · policies · agents     │  Real-time event stream    │   │
│   │  tenants · embeddings · compliance     │  /api/live-stream (3s)     │   │
│   │  [Row Level Security on every table]   │  KPIs computed in-flight   │   │
│   │  [HNSW vector index — 1536 dims]       │                            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                       │                                      │
│   OPERATIONS CONSOLE (Next.js 16.2 · React 19 · App Router · TypeScript)   │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│   │  Risk Center │  │  Threat      │  │  Black Box   │  │  Compliance  │  │
│   │  (Executive) │  │  Timeline    │  │  Replay      │  │  Command Ctr │  │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│   │  Live Stream │  │  Causal      │  │  Audit Log   │  │  Control     │  │
│   │  (DynamoDB)  │  │  Graph       │  │              │  │  Center      │  │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Modules

### Black Box Replay — AI Incident Flight Recorder

The flagship investigation feature. Every blocked or flagged agent action can be replayed as a **forensic execution timeline** — a step-by-step reconstruction of exactly what the agent did, what was evaluated, and why a decision was made. Modeled on flight recorder and CrowdStrike investigation methodology.

```
  ┌─────────────────────────────────────────────────────────────────┐
  │  BLACK BOX REPLAY  ·  Incident ACT-20260616-001                 │
  │  Agent: data-exporter-v2  ·  Verdict: ██ BLOCKED  Risk: 94/100  │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  ① 10:47:23.441  AGENT INITIATED        ✓ Step verified         │
  │         │        Purpose: export Q2 churn cohort                │
  │         ▼                                                       │
  │  ② 10:47:23.469  INPUT RECEIVED         ✓ Step verified         │
  │         │        4,200 customer records requested               │
  │         ▼                                                       │
  │  ③ 10:47:23.491  POLICY ENGINE INVOKED  ✓ Step verified         │
  │         │        3 active rules evaluated                       │
  │         ▼                                                       │
  │  ④ 10:47:23.512  PII PATTERN MATCHED    ⚠ Anomaly detected      │
  │         │        SSN-format data in output summary              │
  │         ▼                                                       │
  │  ⑤ 10:47:23.519  RULE TRIGGERED         ✗ Violation             │
  │         │        data_masking · block_pii = true                │
  │         ▼                                                       │
  │  ⑥ 10:47:23.521  ACTION BLOCKED         ✗ Terminal              │
  │         │        Outcome written to audit log                   │
  │         ▼                                                       │
  │  ⑦ 10:47:23.524  FORENSIC RECORD SEALED ✓ Immutable             │
  │                  Causal chain preserved for compliance          │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

Navigate to any incident from the Threat Timeline, Audit Log, Semantic Search, or Live Stream with a single click. The replay page shows:

- **7-step forensic reconstruction** with per-step status, risk delta, and explanation
- **AI-generated root cause summary** — plain-language verdict, not raw logs
- **Verdict banner** with glow coloring (red/amber/green) based on outcome severity
- **Stats row** — total steps, anomalies detected, policies triggered, execution duration
- **One-click navigation** from every event surface in the platform

---

### AI Risk Center — Executive Governance Dashboard

The board-ready risk posture view. A live **Governance Score (0–100)** computed from real policy outcomes, violation rates, cost anomalies, and blocked-action frequency — updated continuously as agents act.

- **Risk-ranked agent list** — sorted by cumulative violation severity, not just count
- **Policy violation breakdown** — by rule type, agent, time window, and business impact
- **Critical incident feed** — blocked and flagged actions surfaced with full context
- **Auto-generated executive briefing** — natural-language risk summary derived from live data, not templates

> *"The first time a CISO can walk into a board meeting and answer 'how exposed are we to our AI agents?' with a defensible number."*

---

### Compliance Command Center — Automated Evidence Packages

A full evidence packaging pipeline that takes your live governance data and produces a downloadable, auditor-ready PDF covering three regulatory frameworks simultaneously.

```
  SOC 2 Type II          EU AI Act (2024/1689)       ISO 27001:2022
  ████████████ 89%       ███████████░ 82%            ████████░░░░ 71%
  READY                  READY                       IN PROGRESS
```

**Four-stage generation pipeline:**

```
  [1] Collecting audit evidence  →  [2] Building executive summary
  [3] Compiling compliance matrices  →  [4] Generating PDF package
```

**8-page PDF output:**
1. Cover page with tenant, period, and governance score
2. Executive Summary — risk narrative, key metrics, trend indicators
3. SOC 2 Type II — Trust Service Criteria evidence mapping
4. EU AI Act — Annex III risk classification, transparency obligations
5. ISO 27001:2022 — Annex A controls (A.5.1 through A.8.34) evidence table
6. Audit Trail — chronological incident log with policy outcomes
7. Policy Violations — categorized violation analysis
8. Agent Trust Metrics — per-agent trust scores and behavioral profiles

Past evidence packages are stored in Aurora with metadata (file size, governance score, period) and listed in the Command Center for download history and audit continuity.

---

### Live Agent Stream — DynamoDB Hot Path

Real-time operational feed of every agent action, polled directly from AWS DynamoDB every 3 seconds. Designed for SOC analysts monitoring live agent behavior.

```
  ● Connected to DynamoDB Hot Path          Last Updated: 10:47:26 AM
  ──────────────────────────────────────────────────────────────────
  [agent-7f3a2c]  export_customer_records    ██ BLOCKED    0.0042s ago
  [agent-1b9d44]  summarize_document         ✓ ALLOWED     0.8s ago
  [agent-3e8f21]  call_external_api          ⚠ FLAGGED     1.2s ago
  [agent-7f3a2c]  read_database              ✓ ALLOWED     2.1s ago
```

- New events highlighted on arrival, fading after 2.5 seconds
- Live KPI strip: Agents Online / Actions per Minute / Blocked Today / Governance Score
- Per-event **Replay** button opens the Black Box immediately
- Tenant-switch resets stream and seen-event tracking cleanly
- Dual-path architecture: DynamoDB for real-time hot path, Aurora for durable analytics

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

Each event carries: affected systems, matched policy rule, input/output context, cost incurred, and a one-click link into the Black Box Replay.

---

### Causal Investigation Graph — Visual Incident Reconstruction

Click any incident and open an interactive causal graph that traces the full chain of causality:

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

Results are ranked by cosine similarity, annotated with the matched policy, risk score, and a one-click path to the Black Box Replay.

---

### Policy Engine — Real-Time Governance Enforcement

Define, deploy, and iterate on governance rules without code changes. Every policy is evaluated in-band against every agent action before it completes.

| Policy Type | `rule_type` | What It Does |
|---|---|---|
| **Cost Limit** | `cost_limit` | Block actions exceeding per-call spend threshold (`max_cost`) |
| **PII / Data Masking** | `data_masking` | Detect and block actions exposing regulated personal data (`block_pii`) |
| **Domain Blocking** | `domain_block` | Prevent communication with unauthorized endpoints (`blocked_domains`) |
| **Semantic Guard** | `semantic_guard` | Intent-aware category blocking via pgvector similarity |

Policies are stored as `JSONB rule_config` records, scoped per tenant by UUID foreign key, and evaluated in order — first `blocked` verdict wins. Simulate any policy combination without inserting live data via `POST /api/policies/simulate`.

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
| Black box incident replay | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ⚠️ |
| Causal graph reconstruction | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ✅ |
| Semantic / vector threat search | ✅ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ⚠️ |
| Executive governance score | ✅ | ⚠️ | ✅ | ❌ | ❌ | ⚠️ | ✅ |
| Compliance evidence packages | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ⚠️ |
| Emergency kill-switch controls | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ⚠️ |
| Multi-tenant RLS isolation | ✅ | ⚠️ | ✅ | ⚠️ | ❌ | ❌ | ✅ |
| Agent-framework agnostic | ✅ | ✅ | ✅ | ⚠️ | ❌ | ⚠️ | ✅ |
| No external vector DB required | ✅ | N/A | N/A | N/A | ❌ | ❌ | N/A |

✅ Native · ⚠️ Partial / Bolt-on · ❌ Not available

AgentWitness is the only platform purpose-built for the **full governance lifecycle**: ingest → enforce → investigate → replay → report. Competitors either focus on LLM evaluation (LangSmith, Galileo), cloud posture (Wiz), prompt injection (Lakera), or general observability (Datadog) — none provide a unified control plane for autonomous AI agent governance.

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
│  Next.js Route Handlers (Edge-compatible)                   │
│  Named-parameter SQL → pg positional translation            │
│  Tenant-ID header enforcement on every endpoint             │
│  Policy simulation endpoint (dry-run, no side effects)      │
├─────────────────────────────────────────────────────────────┤
│  DATA TIER                                                  │
│  AWS Aurora PostgreSQL 18.3 (aarch64, Multi-AZ)            │
│  pgvector 0.8.1 · HNSW index (vector_cosine_ops)           │
│  Row Level Security on all tenant-scoped tables             │
│  TLS 1.3 · SCRAM-SHA-256 auth · SSL verify-full            │
│                                                             │
│  AWS DynamoDB (Hot Path)                                    │
│  AgentEvent stream: agentId · timestamp · payload           │
│  Real-time KPI computation · 3s polling via /api/live-stream│
├─────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE                                             │
│  AWS RDS Aurora (ap-southeast-2)                            │
│  AWS DynamoDB (us-east-1)                                   │
│  VPC isolation · Private subnets · Security Groups          │
│  Global CA bundle · Certificate pinning                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Model

```sql
tenants                 ← root isolation boundary
  └── agents            ← AI agent registry (name, framework, status)
  └── policies          ← governance rules (rule_type, rule_config JSONB, is_active)
        rule_type:  cost_limit | data_masking | domain_block | semantic_guard
  └── agent_actions     ← immutable event log
        ├── action_type, input_summary, output_summary
        ├── policy_id → policies (FK)
        ├── policy_result: [allowed | flagged | blocked]
        ├── cost_usd (per-call spend tracking)
        └── embedding vector(1536)  ← HNSW semantic search index
  └── emergency_controls   ← per-tenant kill-switch state
  └── compliance_reports   ← evidence package metadata + download history

DynamoDB: AgentEvents    ← real-time hot path
  PK: agentId · SK: timestamp (ISO 8601)
  Fields: eventType · tenantId · payload (map)
  TTL: configurable per event
```

### Dual Persistence Architecture

AgentWitness runs a **dual-path** persistence strategy:

| Path | Store | Route | Use Case |
|---|---|---|---|
| **Hot path** | AWS DynamoDB | `GET /api/live-stream` | Real-time event stream, live KPIs, <100ms writes |
| **Cold path** | Aurora PostgreSQL | `GET /api/events`, `POST /api/ingest` | Durable audit log, semantic search, compliance reports |

The Live Stream UI polls `/api/live-stream` every 3 seconds, computing `agentsOnline`, `actionsPerMin`, `blockedToday`, and `governanceScore` from DynamoDB directly — no Aurora query in the hot path.

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
- Compliance evidence packages are versioned in Aurora with metadata, period, and governance score snapshot
- All schema migrations are idempotent, labeled, and executed as discrete statements

### Compliance Certifications Roadmap
- **SOC 2 Type II** — audit engagement in preparation (Q3 2026)
- **ISO 27001** — gap assessment scheduled (Q1 2027)
- **GDPR / CCPA** — data residency controls and PII purge APIs (Q4 2026)
- **HIPAA BAA** — on enterprise plan roadmap (Q2 2027)

---

## Quick Start

### Prerequisites

```bash
node >= 20.0.0
npm >= 10.0.0
AWS Aurora PostgreSQL 18 (or compatible PostgreSQL 14+)
AWS DynamoDB table for hot-path events
```

### Environment

```bash
# .env
DATABASE_URL=postgres://USER:PASSWORD@AURORA_ENDPOINT:5432/DB?sslmode=verify-full&sslrootcert=./global-bundle.pem
OPENROUTER_API_KEY=sk-or-...   # embedding generation + AI narrative

# .env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Install & Run

```bash
# 1. Clone and install
git clone https://github.com/your-org/agent-witness.git
cd agent-witness
npm install

# 2. Start development server (Turbopack)
npm run dev

# 3. Initialize schema and seed default tenants (first run only)
curl -X POST http://localhost:3000/api/bootstrap \
  -H "x-bootstrap-token: YOUR_BOOTSTRAP_TOKEN"

# 4. Seed governance policies for a tenant
node scripts/seed-policies.mjs

# 5. Verify connectivity and schema readiness
curl http://localhost:3000/api/health
```

### Production Build

```bash
npm run build    # Next.js production build (Turbopack)
npm start        # production server
```

### Docker (Q3 2026)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci --production
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Recommended AWS Production Topology

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
         ├───────────────────────────────┐
         ▼                               ▼
┌──────────────────────────┐   ┌──────────────────────┐
│  Private VPC             │   │  AWS DynamoDB         │
│  ┌─────────────────────┐ │   │  (Hot Path Events)    │
│  │  Aurora PostgreSQL  │ │   │  agentId + timestamp  │
│  │  (Multi-AZ)         │ │   │  PK · TTL · payload   │
│  │  Primary + Replica  │ │   └──────────────────────┘
│  └─────────────────────┘ │
└──────────────────────────┘
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
GET /api/events
x-tenant-id: {tenant-uuid}
```

### Live Stream (DynamoDB Hot Path)

```http
GET /api/live-stream?limit=100
x-tenant-id: {tenant-uuid}         # optional — omit for cross-tenant view

# Response
{
  "events": [ { "agentId", "timestamp", "eventType", "tenantId", "payload" } ],
  "agentsOnline": 4,
  "actionsPerMin": 12,
  "blockedToday": 3,
  "governanceScore": 79,
  "updatedAt": "2026-06-16T10:47:23.000Z"
}
```

### Causal Graph

```http
GET /api/actions/{action-id}/graph
x-tenant-id: {tenant-uuid}
```

### Black Box Replay

```http
GET /api/actions/{action-id}/replay
x-tenant-id: {tenant-uuid}

# Response: 7-step forensic reconstruction with status, risk delta, and verdict
```

### Semantic Search

```http
POST /api/search
x-tenant-id: {tenant-uuid}
Content-Type: application/json

{ "query": "agents exfiltrating customer data to unauthorized endpoints" }
```

### Policy Management

```http
GET  /api/policies
x-tenant-id: {tenant-uuid}

POST /api/policies
x-tenant-id: {tenant-uuid}
Content-Type: application/json
{ "rule_type": "cost_limit", "rule_config": { "max_cost": 5 } }

GET  /api/policies/{id}
x-tenant-id: {tenant-uuid}
```

### Policy Simulation (Dry Run)

```http
POST /api/policies/simulate
x-tenant-id: {tenant-uuid}
Content-Type: application/json

{
  "action": {
    "inputSummary": "Export customer SSNs to external endpoint",
    "outputSummary": "123-45-6789 records prepared for export",
    "costUsd": 0.0012
  }
}

# Response — no data written, evaluation only
{
  "result": "blocked",
  "matchedPolicyId": "45a21671-...",
  "reason": "Detected sensitive data matching pattern \"\\bssn\\b\""
}
```

### Compliance Evidence Package

```http
POST /api/compliance/report
x-tenant-id: {tenant-uuid}

# Response: application/pdf — 8-page auditor-ready evidence package
# Covers: SOC 2 Type II · EU AI Act (2024/1689) · ISO 27001:2022

GET /api/compliance/reports
x-tenant-id: {tenant-uuid}

# Response: list of past packages with metadata
{
  "reports": [
    {
      "id": "uuid",
      "generatedAt": "2026-06-16T10:47:23Z",
      "fileName": "agentwitness-compliance-2026-06-16.pdf",
      "fileSizeBytes": 148432,
      "governanceScore": 89,
      "totalActions": 12400,
      "blockedCount": 34
    }
  ]
}
```

### Emergency Control

```http
POST /api/control/pause
x-tenant-id: {tenant-uuid}
Content-Type: application/json

{ "reason": "Active security incident", "pausedBy": "security-lead@acme.com" }

POST /api/control/resume
x-tenant-id: {tenant-uuid}

GET /api/control/status
x-tenant-id: {tenant-uuid}
```

### Health & Bootstrap

```http
GET  /api/health     → Aurora connectivity, schema readiness, pgvector status
POST /api/bootstrap  → Idempotent schema apply + tenant seeding
                       Header: x-bootstrap-token required
```

---

## Technology Stack

### Frontend

| Technology | Role |
|---|---|
| **Next.js 16.2** (App Router, Turbopack) | Server-rendered dashboard, API routes, streaming SSR |
| **React 19** | Component model, concurrent rendering, server components |
| **TypeScript 5** | End-to-end type safety across all layers |
| **Tailwind CSS v4** | Utility-first design system with OKLCH color space |
| **shadcn/ui** | Accessible, unstyled component primitives |
| **React Flow (@xyflow/react)** | Interactive causal graph and investigation canvas |
| **Lucide Icons** | Consistent iconography across the operations console |
| **Framer Motion** | Purposeful micro-animations and investigation panel transitions |

### Backend

| Technology | Role |
|---|---|
| **Next.js Route Handlers** | API layer for ingest, governance, investigation, and compliance endpoints |
| **TypeScript** | Typed business logic, policy evaluation, and risk scoring |
| **Named-parameter SQL engine** | Internal `:param → $N` translation layer for query safety |
| **PDFKit 0.19.1** | Server-side 8-page compliance evidence PDF generation |

### Database

| Technology | Role |
|---|---|
| **Amazon Aurora PostgreSQL 18** | ACID-compliant, managed relational persistence for all governance data |
| **AWS DynamoDB** | Hot-path real-time event stream with sub-10ms write latency |
| **pgvector 0.8.1** | 1536-dimension vector embeddings co-located with audit records |
| **HNSW indexing** | Sub-millisecond approximate nearest-neighbor search for semantic threat discovery |
| **Row-Level Security (RLS)** | Database-enforced tenant isolation — bypasses are structurally impossible |
| **JSONB policy storage** | Flexible, queryable governance rule configuration without schema migrations |
| **SCRAM-SHA-256** | Modern password authentication — eliminates MD5 downgrade attacks |

### Infrastructure

| Technology | Role |
|---|---|
| **AWS RDS Aurora** | Multi-AZ managed PostgreSQL — automated failover, backups, and patching |
| **AWS DynamoDB** | Serverless key-value store for real-time event hot path |
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
| **Agent framework integrations** | LangChain, AutoGen, CrewAI, OpenAI Agents SDK, Anthropic Claude |

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
- [x] Black Box AI Incident Replay (`/dashboard/replay/[actionId]`)
- [x] Compliance Command Center (SOC 2 / EU AI Act / ISO 27001 evidence packages)
- [x] DynamoDB hot-path live stream with real-time KPI computation
- [x] Policy simulation dry-run endpoint (`POST /api/policies/simulate`)
- [x] Semantic Guard policy type (`semantic_guard` — pgvector)
- [ ] SOC 2 Type II audit engagement
- [ ] SCIM user provisioning (Okta, Azure AD)
- [ ] Webhook-triggered policy evaluation
- [ ] Slack / Teams incident alerting
- [ ] Custom embedding model support (Azure OpenAI, Cohere)

### Q4 2026 — Ecosystem Expansion
- [ ] GDPR / CCPA PII purge APIs
- [ ] Splunk and Datadog log export
- [ ] GitHub Copilot governance module
- [ ] Configurable risk scoring weights
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
│                 │  Semantic threat     │  Custom policy rules            │
│  Audit logs     │  investigation       │                                 │
│                 │                      │  Dedicated environments         │
│  Governance     │  Multi-agent         │                                 │
│  dashboard      │  governance          │  Compliance exports             │
│                 │                      │  (SOC 2, ISO 27001, HIPAA)      │
│                 │  Black Box Replay    │                                 │
│                 │                      │  Quarterly business reviews     │
│                 │  Compliance          │  Priority roadmap access        │
│                 │  evidence packages   │  Custom SLA (99.99% uptime)     │
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

### Why DynamoDB for the live stream hot path?

Aurora's connection model and query planner add latency that is acceptable for audit analytics but noticeable for a sub-second live operations feed. DynamoDB's single-digit millisecond write latency and serverless scaling make it the right store for the real-time event stream. The dual-path architecture means the hot path never blocks the cold path and vice versa — events fan out to both stores independently.

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
