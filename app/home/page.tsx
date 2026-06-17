import Link from "next/link";
import { Brain, Shield, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveAgentCard } from "@/components/live-agent-card";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <nav className="flex h-16 items-center border-b border-border px-6 lg:px-12">
        <span className="text-xl font-bold tracking-tight">AgentWitness</span>
      </nav>

      <section className="mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <Badge variant="outline" className="mb-6 border-border text-muted-foreground">
          B2B AI Governance
        </Badge>
        <h1 className="text-5xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
          Semantic Audit Trail for AI Agents
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          When AI agents hallucinate, leak PII, or go rogue — who is liable? You are. SOC2 and the EU
          AI Act demand audit trails that capture intent, not just metrics.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Button
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            render={<Link href="/dashboard/executive" />}
          >
            Enter Dashboard
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-border"
            render={<Link href="/dashboard/anomalies" />}
          >
            Semantic Search
          </Button>
        </div>

        <LiveAgentCard />
      </section>

      <section className="border-y border-border bg-card/50 py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 md:grid-cols-3">
          <div>
            <Brain className="mb-4 h-8 w-8 text-chart-1" />
            <h2 className="text-xl font-semibold">Semantic Search</h2>
            <p className="mt-2 text-muted-foreground">
              Query agent intent using pgvector. Find &ldquo;suspicious&rdquo; behavior even when
              agents don&apos;t use that word. Aurora PostgreSQL HNSW indexes make it instant.
            </p>
          </div>
          <div>
            <Shield className="mb-4 h-8 w-8 text-accent" />
            <h2 className="text-xl font-semibold">Row-Level Security</h2>
            <p className="mt-2 text-muted-foreground">
              True multi-tenancy enforced by PostgreSQL RLS, not application code. SET
              app.current_tenant isolates data at the database layer.
            </p>
          </div>
          <div>
            <Zap className="mb-4 h-8 w-8 text-warning" />
            <h2 className="text-xl font-semibold">Real-Time Policy Engine</h2>
            <p className="mt-2 text-muted-foreground">
              Block PII access, cost overruns, and suspicious domains before they happen. JSONB
              policy rules evaluated on every agent action.
            </p>
          </div>
        </div>
      </section>

      <div className="border-t border-border py-8 text-center">
        <p className="text-sm text-muted-foreground">Built on Vercel + Amazon Aurora PostgreSQL</p>
        <p className="mt-1 text-xs text-muted-foreground/70">Serverless. Scalable. Shippable.</p>
      </div>

      <footer className="py-6 text-center text-xs text-muted-foreground/70">
        AgentWitness • B2B AI Governance Platform
      </footer>
    </div>
  );
}
