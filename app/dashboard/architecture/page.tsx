"use client";

import { Database, Globe, Lock, Search, Server, Shield, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Sub-components ─────────────────────────────────────────────────────────────

function TechBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ background: color + "22", color }}
    >
      {label}
    </span>
  );
}

function Arrow({ label, color = "#64748b" }: { label?: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1">
      <div className="h-6 w-px" style={{ background: color + "60" }} />
      <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
        <path d="M6 8L0 0h12L6 8z" fill={color} fillOpacity="0.6" />
      </svg>
      {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
    </div>
  );
}

function HArrow({ label, color = "#64748b" }: { label?: string; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-2">
      <svg width="24" height="10" viewBox="0 0 24 10" fill="none" className="rotate-0">
        <path d="M0 5h20M16 1l4 4-4 4" stroke={color} strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
    </div>
  );
}

interface NodeProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  tags: { label: string; color: string }[];
  accentColor: string;
  description: string;
}

function ArchNode({ icon: Icon, title, subtitle, tags, accentColor, description }: NodeProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border p-4"
      style={{ borderColor: accentColor + "40", background: accentColor + "08" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: accentColor + "20" }}
        >
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <TechBadge key={t.label} label={t.label} color={t.color} />
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ArchitecturePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">System Architecture</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AgentWitness infrastructure — Vercel Edge + Amazon Aurora PostgreSQL (pgvector + RLS) + DynamoDB hot path.
        </p>
      </div>

      {/* Main architecture diagram */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Data Flow Diagram</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-0">

            {/* Layer 1: Client */}
            <div className="grid w-full max-w-2xl grid-cols-1 gap-4">
              <ArchNode
                icon={Globe}
                title="Browser / Client"
                subtitle="Dashboard, Live Stream, Semantic Search"
                accentColor="#06b6d4"
                tags={[
                  { label: "React 19", color: "#06b6d4" },
                  { label: "Next.js App Router", color: "#6366f1" },
                  { label: "TailwindCSS v4", color: "#22c55e" },
                ]}
                description="Server-side rendered dashboard with client-side polling every 3 s. Semantic search, live agent stream, compliance PDF export, and causal graph all driven from real Aurora data."
              />
            </div>

            <Arrow label="HTTPS / REST" color="#06b6d4" />

            {/* Layer 2: Vercel */}
            <div className="grid w-full max-w-2xl grid-cols-1 gap-4">
              <ArchNode
                icon={Server}
                title="Vercel Edge — Next.js 15"
                subtitle="App Router · API Routes · Server Actions"
                accentColor="#6366f1"
                tags={[
                  { label: "/api/ingest", color: "#22c55e" },
                  { label: "/api/simulate", color: "#f59e0b" },
                  { label: "/api/search (pgvector)", color: "#a855f7" },
                  { label: "/api/compliance/report", color: "#06b6d4" },
                  { label: "/api/live/stream (SSE)", color: "#ef4444" },
                ]}
                description="26 API routes. Every action is persisted to Aurora with embeddings. Policy engine evaluates each action before insertion. Compliance PDF generated from live DB queries via pdfkit."
              />
            </div>

            {/* Layer 3: Fork to Aurora + DynamoDB + OpenRouter */}
            <div className="flex w-full max-w-2xl items-start justify-center gap-2 py-2">
              <div className="flex flex-1 flex-col items-center">
                <div className="h-6 w-px bg-border/60" />
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path d="M6 8L0 0h12L6 8z" fill="#64748b" fillOpacity="0.6" />
                </svg>
                <span className="text-[10px] text-muted-foreground">Write + Read</span>
              </div>
              <div className="flex flex-1 flex-col items-center">
                <div className="h-6 w-px bg-border/60" />
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path d="M6 8L0 0h12L6 8z" fill="#64748b" fillOpacity="0.6" />
                </svg>
                <span className="text-[10px] text-muted-foreground">Fire-and-forget</span>
              </div>
              <div className="flex flex-1 flex-col items-center">
                <div className="h-6 w-px bg-border/60" />
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path d="M6 8L0 0h12L6 8z" fill="#64748b" fillOpacity="0.6" />
                </svg>
                <span className="text-[10px] text-muted-foreground">Embed text</span>
              </div>
            </div>

            <div className="grid w-full max-w-2xl grid-cols-3 gap-3">
              <ArchNode
                icon={Database}
                title="Aurora PostgreSQL"
                subtitle="ap-southeast-2 · RDS"
                accentColor="#22c55e"
                tags={[
                  { label: "pgvector 0.8", color: "#a855f7" },
                  { label: "HNSW index", color: "#6366f1" },
                  { label: "RLS policies", color: "#22c55e" },
                  { label: "vector(1536)", color: "#06b6d4" },
                ]}
                description="Primary store for all agent actions, policies, and trust scores. HNSW index on embedding column for sub-millisecond cosine similarity search."
              />
              <ArchNode
                icon={Zap}
                title="Amazon DynamoDB"
                subtitle="us-east-1 · Hot Path"
                accentColor="#f59e0b"
                tags={[
                  { label: "TTL 30 days", color: "#f59e0b" },
                  { label: "Fire-and-forget", color: "#94a3b8" },
                ]}
                description="Writes mirrored from every Aurora insert for <10 ms live stream latency. Polled every 3 s by the Live Stream page. Never blocks Aurora writes."
              />
              <ArchNode
                icon={Search}
                title="OpenRouter API"
                subtitle="text-embedding-3-small"
                accentColor="#a855f7"
                tags={[
                  { label: "1536 dims", color: "#a855f7" },
                  { label: "Local fallback", color: "#64748b" },
                ]}
                description="Generates semantic embeddings for every ingested action. Local SHA-256 PRNG fallback ensures ingestion never blocks on API unavailability."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature highlights grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Row Level Security</span>
            </div>
            <p className="text-sm text-muted-foreground">
              PostgreSQL RLS policies on <code className="rounded bg-muted px-1 text-xs">agents</code>,{" "}
              <code className="rounded bg-muted px-1 text-xs">policies</code>, and{" "}
              <code className="rounded bg-muted px-1 text-xs">agent_actions</code> enforce true
              multi-tenant data isolation at the database layer — not the application layer.
            </p>
            <div className="mt-3 rounded bg-muted/60 p-2 font-mono text-[10px] text-muted-foreground">
              SET app.current_tenant = :tenantId;<br />
              -- RLS automatically filters all queries
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Search className="h-5 w-5 text-purple-500" />
              <span className="font-semibold">pgvector Semantic Search</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Every agent action is embedded into a 1536-dim vector and stored in Aurora.
              HNSW index enables ANN search with cosine similarity. Judges can search
              &ldquo;unauthorized access&rdquo; and find relevant incidents semantically.
            </p>
            <div className="mt-3 rounded bg-muted/60 p-2 font-mono text-[10px] text-muted-foreground">
              ORDER BY embedding &lt;=&gt; :query::vector<br />
              -- HNSW cosine distance
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-500" />
              <span className="font-semibold">Real-Time Policy Engine</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Each ingest call fetches active policies from Aurora and evaluates the action
              before insertion. Three rule types: <strong>cost_limit</strong>,{" "}
              <strong>data_masking</strong> (PII detection), and <strong>domain_block</strong>.
              Blocked actions are still written for full audit trail fidelity.
            </p>
            <div className="mt-3 rounded bg-muted/60 p-2 font-mono text-[10px] text-muted-foreground">
              result: &quot;blocked&quot; | &quot;flagged&quot; | &quot;allowed&quot;<br />
              -- persisted with policy_id FK
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="font-semibold">Live Simulation Engine</span>
            </div>
            <p className="text-sm text-muted-foreground">
              <code className="rounded bg-muted px-1 text-xs">POST /api/simulate</code> generates
              realistic agent activity on demand (70% allowed / 20% blocked / 10% flagged).
              Events flow Aurora → DynamoDB → Live Stream within 3 seconds. Toggle auto-simulation
              on the Live Stream page.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-500" />
              <span className="font-semibold">Compliance PDF from Live Data</span>
            </div>
            <p className="text-sm text-muted-foreground">
              The compliance package generator queries Aurora for live governance metrics,
              agent trust scores, and recent incidents. PDFKit renders a 10-page enterprise
              report (SOC 2 / EU AI Act / ISO 27001) using the actual database state at
              generation time.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Historical Seed</span>
            </div>
            <p className="text-sm text-muted-foreground">
              <code className="rounded bg-muted px-1 text-xs">POST /api/simulate/seed</code>{" "}
              (protected by bootstrap token) inserts 300 backdated events spread across the
              last 7 days, including local embeddings, ensuring all dashboard pages show
              populated data for the demo.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tech stack table */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Technology Stack</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left font-semibold text-foreground">Layer</th>
                <th className="px-4 py-2.5 text-left font-semibold text-foreground">Technology</th>
                <th className="px-4 py-2.5 text-left font-semibold text-foreground">Purpose</th>
                <th className="px-4 py-2.5 text-left font-semibold text-foreground">Demo Relevance</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Frontend",   "Next.js 15 / React 19",            "Dashboard UI, SSR, API routes",                  "Live updating without page refresh"],
                ["Database",   "Amazon Aurora PostgreSQL",          "Primary data store, RLS isolation",              "Proves real multi-tenant DB usage"],
                ["Vector DB",  "pgvector (Aurora extension)",       "1536-dim embedding storage + HNSW ANN",          "Semantic search on agent intent"],
                ["Cache",      "Amazon DynamoDB",                   "Hot-path event mirror, <10 ms reads",            "Live stream latency demo"],
                ["AI",         "OpenRouter (text-embedding-3-small)","Semantic embedding generation",                 "Powers semantic anomaly search"],
                ["PDF",        "PDFKit 0.19.1",                     "Compliance report generation",                   "Live Aurora data → 10-page PDF"],
                ["Auth",       "PostgreSQL RLS policies",           "Row-level tenant isolation",                     "Multi-tenant data isolation proof"],
                ["Hosting",    "Vercel (Serverless)",               "Edge deployment, zero-config",                   "Production-grade infra"],
              ].map(([layer, tech, purpose, demo], i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                  <td className="px-4 py-2.5 font-medium text-foreground">{layer}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-accent">{tech}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{purpose}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{demo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
