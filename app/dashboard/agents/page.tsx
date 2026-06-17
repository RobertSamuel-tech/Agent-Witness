"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Minus,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import type { AgentTrustSummary, RiskTrend } from "@/lib/db/trust-scores";

// ── Helpers ───────────────────────────────────────────────────────────────────

type TrustLevel = "TRUSTED" | "WATCHLIST" | "HIGH RISK" | "CRITICAL";

function getTrustLevel(score: number): TrustLevel {
  if (score >= 80) return "TRUSTED";
  if (score >= 60) return "WATCHLIST";
  if (score >= 40) return "HIGH RISK";
  return "CRITICAL";
}

function trustLevelConfig(level: TrustLevel) {
  switch (level) {
    case "TRUSTED":
      return { color: "#22c55e", bg: "#22c55e12", border: "#22c55e30", Icon: ShieldCheck };
    case "WATCHLIST":
      return { color: "#f59e0b", bg: "#f59e0b12", border: "#f59e0b30", Icon: ShieldAlert };
    case "HIGH RISK":
      return { color: "#ef4444", bg: "#ef444412", border: "#ef444430", Icon: ShieldAlert };
    case "CRITICAL":
      return { color: "#dc2626", bg: "#dc262612", border: "#dc262630", Icon: ShieldAlert };
  }
}

function trendConfig(trend: RiskTrend) {
  switch (trend) {
    case "improving": return { label: "Improving", color: "#22c55e", Icon: TrendingUp };
    case "degrading": return { label: "Declining", color: "#ef4444", Icon: TrendingDown };
    default: return { label: "Stable", color: "#64748b", Icon: Minus };
  }
}

// ── Mini sparkline ─────────────────────────────────────────────────────────────

function Sparkline({ scores, idx }: { scores: number[]; idx: number }) {
  if (scores.length < 2) return <div className="h-8 w-24" />;
  const color = scores[scores.length - 1] >= 80 ? "#22c55e" : scores[scores.length - 1] >= 60 ? "#f59e0b" : "#ef4444";
  const W = 96, H = 32;
  const pts = scores.map((s, i) => ({ x: (i / (scores.length - 1)) * W, y: H - (s / 100) * H }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${W} ${H} L 0 ${H} Z`;
  const gId = `spark-${idx}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 opacity-75">
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gId})`} />
      <path d={pathD} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ── Agent card ────────────────────────────────────────────────────────────────

function AgentCard({ agent, idx }: { agent: AgentTrustSummary; idx: number }) {
  const level = getTrustLevel(agent.trustScore);
  const levelCfg = trustLevelConfig(level);
  const tc = trendConfig(agent.riskTrend);
  const TrendIcon = tc.Icon;
  const LevelIcon = levelCfg.Icon;

  return (
    <Link href={`/dashboard/agents/${agent.agentId}`} className="group block">
      <div
        className="relative overflow-hidden rounded-xl border bg-background p-5 transition-all duration-200 hover:border-white/10 hover:shadow-lg"
        style={{ borderColor: levelCfg.border }}
      >
        {/* Left accent stripe */}
        <div
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ background: levelCfg.color, boxShadow: `0 0 10px ${levelCfg.color}66` }}
        />

        {/* Header row */}
        <div className="ml-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-bold text-foreground">
                {agent.agentName}
              </span>
              {agent.agentFramework && (
                <Badge variant="outline" className="shrink-0 border-border px-1.5 py-0 text-[10px] text-muted-foreground">
                  {agent.agentFramework}
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <LevelIcon className="h-3 w-3 shrink-0" style={{ color: levelCfg.color }} />
              <span className="text-[11px] font-bold tracking-wide" style={{ color: levelCfg.color }}>
                {level}
              </span>
            </div>
          </div>

          {/* Score ring */}
          <div className="shrink-0 text-right">
            <span className="text-3xl font-black leading-none" style={{ color: levelCfg.color }}>
              {agent.trustScore}
            </span>
            <p className="text-[10px] text-muted-foreground/50">/ 100</p>
          </div>
        </div>

        {/* Trust score bar */}
        <div className="mx-2 mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${agent.trustScore}%`,
              background: levelCfg.color,
              boxShadow: `0 0 6px ${levelCfg.color}55`,
            }}
          />
        </div>

        {/* Metrics row */}
        <div className="mx-2 mt-3 flex items-end justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-muted-foreground">
                Compliance{" "}
                <span className="font-bold text-foreground/80">{agent.complianceScore}%</span>
              </span>
              <span className="text-muted-foreground">
                Violations{" "}
                <span className="font-bold" style={{ color: agent.violationRate > 0.1 ? "#ef4444" : "#64748b" }}>
                  {(agent.violationRate * 100).toFixed(0)}%
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendIcon className="h-3 w-3" style={{ color: tc.color }} />
              <span className="text-[11px] font-semibold" style={{ color: tc.color }}>
                {tc.label}
              </span>
              <span className="text-[11px] text-muted-foreground/40">
                · {agent.totalActions} actions
              </span>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Sparkline scores={agent.recentTrend} idx={idx} />
            <ArrowRight
              className="mb-1 h-4 w-4 shrink-0 text-muted-foreground/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/60"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Mock data ─────────────────────────────────────────────────────────────────

function buildMock(): AgentTrustSummary[] {
  return [
    { agentId: "00000000-0000-0000-0000-000000000001", agentName: "DataSync Pro v2.1", agentFramework: "LangChain", trustScore: 66, complianceScore: 72, violationRate: 0.28, riskTrend: "degrading", totalActions: 89, blockedCount: 8, flaggedCount: 11, allowedCount: 70, recentTrend: [92, 88, 82, 78, 74, 70, 66] },
    { agentId: "00000000-0000-0000-0000-000000000002", agentName: "AnalyticsBot v1.4", agentFramework: "AutoGen", trustScore: 91, complianceScore: 96, violationRate: 0.04, riskTrend: "stable", totalActions: 214, blockedCount: 2, flaggedCount: 7, allowedCount: 205, recentTrend: [88, 90, 91, 90, 93, 91, 91] },
    { agentId: "00000000-0000-0000-0000-000000000003", agentName: "ExportAgent", agentFramework: "CrewAI", trustScore: 34, complianceScore: 61, violationRate: 0.39, riskTrend: "degrading", totalActions: 46, blockedCount: 11, flaggedCount: 7, allowedCount: 28, recentTrend: [55, 50, 48, 42, 40, 38, 34] },
    { agentId: "00000000-0000-0000-0000-000000000004", agentName: "SupportAgent v3", agentFramework: "LangGraph", trustScore: 78, complianceScore: 88, violationRate: 0.12, riskTrend: "improving", totalActions: 132, blockedCount: 3, flaggedCount: 13, allowedCount: 116, recentTrend: [68, 70, 72, 74, 74, 76, 78] },
  ];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentIntelligencePage() {
  const { selectedTenantId, loading: tenantsLoading } = useTenants();
  const [agents, setAgents] = useState<AgentTrustSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (tenantsLoading) return;

    if (!selectedTenantId) {
      setAgents(buildMock());
      setIsDemo(true);
      setLoading(false);
      return;
    }

    const tenantId = selectedTenantId;
    let cancelled = false;
    setLoading(true);

    fetch("/api/agents/trust", { headers: { "x-tenant-id": tenantId } })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { agents: AgentTrustSummary[] } | null) => {
        if (cancelled) return;
        if (body?.agents?.length) {
          setAgents(body.agents);
          setIsDemo(false);
        } else {
          setAgents(buildMock());
          setIsDemo(true);
        }
      })
      .catch(() => {
        if (!cancelled) { setAgents(buildMock()); setIsDemo(true); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedTenantId, tenantsLoading]);

  // Derived KPIs
  const avgScore = agents.length ? Math.round(agents.reduce((s, a) => s + a.trustScore, 0) / agents.length) : 0;
  const criticalCount = agents.filter((a) => getTrustLevel(a.trustScore) === "CRITICAL").length;
  const watchlistCount = agents.filter((a) => getTrustLevel(a.trustScore) === "WATCHLIST").length;
  const highRiskCount = agents.filter((a) => getTrustLevel(a.trustScore) === "HIGH RISK").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">Agent Intelligence</h1>
            {isDemo && (
              <Badge variant="outline" className="border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] text-[10px]">
                Demo
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Real-time trust scores and compliance health for all monitored AI agents.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-[#dc2626]/30 bg-[#dc2626]/10 px-2.5 py-1 font-bold text-[#dc2626]">
              {criticalCount} CRITICAL
            </span>
          )}
          {highRiskCount > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-[#ef4444]/30 bg-[#ef4444]/10 px-2.5 py-1 font-bold text-[#ef4444]">
              {highRiskCount} HIGH RISK
            </span>
          )}
          {watchlistCount > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-2.5 py-1 font-bold text-[#f59e0b]">
              {watchlistCount} WATCHLIST
            </span>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Agents", value: agents.length, color: "#06b6d4" },
          { label: "Avg Trust Score", value: avgScore, color: avgScore >= 80 ? "#22c55e" : avgScore >= 60 ? "#f59e0b" : "#ef4444" },
          { label: "Critical", value: criticalCount, color: "#dc2626" },
          { label: "Needs Review", value: highRiskCount + watchlistCount, color: "#f59e0b" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-16 bg-muted" />
            ) : (
              <p className="mt-1 text-3xl font-black" style={{ color }}>{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Agent cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl bg-muted" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Bot className="h-10 w-10 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">No agents found for this tenant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {agents
            .slice()
            .sort((a, b) => a.trustScore - b.trustScore)
            .map((agent, idx) => (
              <AgentCard key={agent.agentId} agent={agent} idx={idx} />
            ))}
        </div>
      )}
    </div>
  );
}
