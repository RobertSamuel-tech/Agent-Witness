<div align="center">

# AgentWitness

### The AI Governance & Security Operations Platform for the Agentic Enterprise

**Real-time visibility, control, and accountability for every action your AI agents take.**

</div>

---


## The Problem

Enterprises are racing to deploy autonomous AI agents into production — agents that read customer data, call internal tools, send emails, hit external APIs, and spend company money, all without a human in the loop on every step.

This creates a governance blind spot that keeps CISOs, compliance officers, and engineering leaders up at night:

- **No visibility** — Which agents did what, when, and why? Most organizations have no centralized record.
- **No guardrails** — A single misconfigured agent can leak PII, exfiltrate customer records, or rack up uncontrolled API spend in minutes.
- **No accountability** — When something goes wrong, security teams are left reconstructing incidents from scattered logs, with no context and no narrative.
- **No proactive defense** — Anomalous agent behavior often looks "normal" until it's already caused damage, because nobody is watching for intent — only keywords.

As AI agents move from experiments to mission-critical infrastructure, the absence of a governance layer isn't a technical debt — it's an existential business risk.

---

## The Solution

**AgentWitness is the control plane for AI agent activity** — a B2B governance platform that gives every organization a single source of truth for how their AI agents behave, what they're allowed to do, and what happens the moment they cross a line.

It combines three things enterprises have never had together in one product:

1. **Policy Enforcement** — Define rules (cost limits, data masking, domain blocking) that are evaluated against every agent action in real time, automatically allowing, flagging, or blocking the action.
2. **Executive Governance Intelligence** — A live governance score, risk-ranked agents, and policy-violation breakdowns that turn raw audit logs into board-ready risk posture.
3. **Semantic Security Investigation** — A CrowdStrike-style threat timeline and AI-powered investigation workstation that lets analysts understand *why* something was blocked, *what systems were affected*, and *what else looks like it* — instantly, with zero manual log-digging.

AgentWitness doesn't just record what agents do. It understands it, scores it, explains it, and helps your team act on it.

---

## Core Capabilities

### 🛡️ AI Risk Center
The executive landing page. A live governance score (0–100) computed from real policy violations, blocked actions, and cost anomalies — giving leadership an instant, defensible answer to "how exposed are we right now?" Includes top-risk-agent rankings, policy violation breakdowns, critical incident feeds, and an automatically generated executive summary.

### 📡 Threat Timeline
A real-time, security-operations-center-style reconstruction of every blocked or flagged incident. Each incident is rendered as an animated, chronological sequence of events — from the moment an agent acted, through policy evaluation, to the final verdict — giving analysts the "what happened, step by step" view that traditional audit tables never could.

### 🔍 AI Investigation Panel
The centerpiece of the platform. Click any action — blocked, flagged, or allowed — and open a full investigation workspace:
- **Why it happened** — the exact policy that triggered, and its configuration
- **Risk Score** — a dynamic 0–100 severity score with animated visualization
- **Affected Assets** — automatically inferred systems (databases, CRMs, external APIs, email, data exports)
- **AI Risk Assessment** — a natural-language security briefing generated from the incident's own data
- **Similar Incidents** — semantically related past incidents, surfaced via vector search, with one-click recursive drill-down

### 🧠 Semantic Threat Discovery
Search your entire agent activity history by *intent*, not keywords. Ask "has any agent exported customer data to an unauthorized destination?" and get ranked, explainable results — powered by vector similarity search, not brittle string matching.

### ⚖️ Policy Engine
Configurable, tenant-scoped rules — cost limits, PII/data-masking, domain blocking — evaluated against every action in real time, with full transparency into what matched and why.

---

## Why It Matters for the Business

| Stakeholder | What AgentWitness Gives Them |
|---|---|
| **CISO / Security Team** | A real-time incident feed and investigation workspace that turns AI agent activity into actionable security intelligence |
| **Compliance & Legal** | An immutable, auditable record of every agent decision and policy outcome, tenant-isolated for multi-org deployments |
| **Engineering Leadership** | A governance score and risk breakdown that quantifies AI risk exposure in terms the board understands |
| **Finance / FinOps** | Real-time cost-limit enforcement that prevents runaway agent spend before it happens |

AgentWitness turns "we have no idea what our AI agents are doing" into "we have a live, explainable, enforced governance layer" — the difference between AI adoption being a liability and being a competitive advantage.

---

## Product Experience

AgentWitness is built as a polished, modern enterprise console — designed to feel like the operations center of a Fortune 500 security team:

- A dark, focus-driven "security operations center" aesthetic
- Component library built on **shadcn/ui** and **v0**-generated UI patterns for a consistent, professional design system
- Smooth, purposeful motion (powered by Framer Motion) that brings investigation workflows to life without feeling gimmicky
- Multi-tenant by design — switch organizations instantly while maintaining complete data isolation

---

## Architecture & Infrastructure

AgentWitness is built on a modern, production-grade stack designed for enterprise scale and security:

- **Frontend & API** — Next.js (App Router), TypeScript, server-rendered dashboards and API routes
- **Database** — **AWS Aurora PostgreSQL**, fully managed, encrypted, and configured with Row-Level Security for strict multi-tenant isolation
- **Vector Search** — **pgvector** with HNSW indexing directly inside Aurora, powering semantic search and similar-incident discovery at scale — no separate vector database required
- **Governance Intelligence** — Deterministic, explainable risk scoring and AI-generated incident narratives derived directly from live governance data — no black boxes, fully auditable
- **Multi-Tenancy** — Every query is tenant-scoped at the database layer, ensuring complete isolation between organizations on shared infrastructure

Every number, score, badge, and narrative in AgentWitness is generated from live data in Aurora — there are no mocked dashboards, no placeholder metrics, and no hardcoded incidents.

---

## Vision

AI agents are becoming the new employees of the enterprise — and every employee needs an HR file, a manager, and an audit trail. AgentWitness is that system of record for the agentic workforce: the platform that lets enterprises adopt AI aggressively, *because* they can see, control, and explain everything it does.
