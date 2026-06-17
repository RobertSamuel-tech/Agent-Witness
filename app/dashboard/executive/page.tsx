"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Minus,
  Bot,
  Zap,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenants } from "@/lib/tenant";
import type {
  ExecutiveDashboard,
  RegulatoryExposureLevel,
  TrustTrendDirection,
} from "@/app/api/executive/route";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK: ExecutiveDashboard = {
  potentialExposureUsd: 142000,
  avoidedLossUsd: 38000,
  governanceScore: 79,
  regulatoryExposure: "HIGH",
  complianceReadiness: 73,
  agentsAtRisk: 3,
  totalAgents: 12,
  trustTrend: "improving",
  trustTrendDelta: 4,
  blockedCount: 34,
  flaggedCount: 89,
  totalActions: 12400,
  totalAiSpend: 247.84,
  policiesActive: 8,
  frameworks: { soc2: 89, euAiAct: 82, iso27001: 71, nistAiRmf: 76 },
  executiveBrief:
    "The organization carries a HIGH regulatory exposure of $142,000, with 34 policy violations recorded across the monitored agent fleet. Immediate remediation actions are recommended for 3 high-risk agents. Overall compliance readiness stands at 73%, with the EU AI Act enforcement window (August 2026) as the nearest material deadline. Trust trend is improving — governance controls are performing above baseline. Of 12 monitored agents, 3 require immediate leadership action. The governance engine has evaluated 12,400 agent actions to date, blocking 34 and flagging 89 for review.",
  topRiskAgents: [
    { name: "DataSync Pro v2.1",   riskScore: 32, blockedCount: 9,  flaggedCount: 14, status: "CRITICAL" },
    { name: "ReportGen Agent",     riskScore: 18, blockedCount: 5,  flaggedCount: 8,  status: "HIGH"     },
    { name: "CustomerAPI Bridge",  riskScore: 12, blockedCount: 3,  flaggedCount: 6,  status: "HIGH"     },
    { name: "AnalyticsBot v1.4",   riskScore: 6,  blockedCount: 1,  flaggedCount: 9,  status: "MODERATE" },
    { name: "EmailCompose Agent",  riskScore: 2,  blockedCount: 0,  flaggedCount: 7,  status: "CONTAINED"},
  ],
  recentIncidents: [
    {
      timestamp: "2026-06-17T10:47:23Z",
      agentName: "DataSync Pro v2.1",
      actionType: "export_customer_records",
      summary: "Attempted export of 4,247 customer records with unmasked PII (SSN, email, phone) to Salesforce Marketing Cloud.",
      severity: "CRITICAL",
      policyArea: "Data Masking",
      estimatedExposureUsd: 5840,
    },
    {
      timestamp: "2026-06-17T09:12:04Z",
      agentName: "ReportGen Agent",
      actionType: "api_call",
      summary: "Outbound API call to unauthorized external domain blocked. Destination classified as unapproved egress endpoint.",
      severity: "HIGH",
      policyArea: "Domain Block",
      estimatedExposureUsd: 3847,
    },
    {
      timestamp: "2026-06-16T22:33:18Z",
      agentName: "CustomerAPI Bridge",
      actionType: "data_access",
      summary: "High-volume database read exceeded approved record threshold. Cost anomaly triggered cost limit policy.",
      severity: "HIGH",
      policyArea: "Cost Limit",
      estimatedExposureUsd: 2910,
    },
    {
      timestamp: "2026-06-16T17:05:47Z",
      agentName: "DataSync Pro v2.1",
      actionType: "export_customer_records",
      summary: "Second export attempt of churn cohort data. Blocked again on PII masking policy — pattern indicates misconfigured agent integration.",
      severity: "CRITICAL",
      policyArea: "Data Masking",
      estimatedExposureUsd: 5840,
    },
    {
      timestamp: "2026-06-16T14:22:09Z",
      agentName: "AnalyticsBot v1.4",
      actionType: "tool_use",
      summary: "Semantic guard flagged intent classification as outside permitted operational scope. Queued for security review.",
      severity: "MODERATE",
      policyArea: "Semantic Guard",
      estimatedExposureUsd: 467,
    },
  ],
  recommendations: [
    {
      priority: "IMMEDIATE",
      title: "Mandate Pre-Transmission Data Controls",
      description: "34 actions were blocked at the enforcement boundary — indicating the governance layer is the sole control preventing data leakage. Direct engineering leadership to implement pre-transmission PII masking and human approval gates within 14 days for all agents with a block history.",
      estimatedImpactUsd: 88040,
      impactLabel: "potential exposure eliminated",
    },
    {
      priority: "IMMEDIATE",
      title: "Place 3 High-Risk Agents Under Supervised Operation",
      description: "3 agents have accumulated risk profiles that exceed acceptable thresholds for autonomous operation. Restrict these agents to supervised mode — requiring human sign-off on high-risk action classes — until remediation is verified by the security team.",
      estimatedImpactUsd: null,
      impactLabel: "reduced incident recurrence probability",
    },
    {
      priority: "SHORT_TERM",
      title: "Accelerate EU AI Act Compliance Gap Closure",
      description: "Current EU AI Act readiness stands at 82%. With enforcement beginning August 2026, closing the remaining gap requires a targeted sprint prioritizing high-risk system classification and audit trail completeness.",
      estimatedImpactUsd: 285000,
      impactLabel: "maximum EU AI Act fine avoided",
    },
    {
      priority: "SHORT_TERM",
      title: "Advance SOC 2 Type II Audit Engagement",
      description: "SOC 2 readiness is at 89%. Initiating the formal audit engagement now targets a Q3 2026 Type II report, strengthening enterprise customer trust and unblocking procurement cycles requiring certification.",
      estimatedImpactUsd: null,
      impactLabel: "enterprise deals unblocked by certification",
    },
    {
      priority: "STRATEGIC",
      title: "Adopt Quarterly AI Governance Board Briefing Cadence",
      description: "Establish a quarterly board briefing using the AgentWitness Compliance Command Center output as the primary evidence package. This satisfies NIST AI RMF accountability requirements and positions the organization ahead of anticipated SEC AI disclosure guidance.",
      estimatedImpactUsd: null,
      impactLabel: "board governance obligation satisfied",
    },
  ],
  generatedAt: new Date().toISOString(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${n.toLocaleString()}`;
  return `$${n}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "UTC",
  });
}

const EXPOSURE_CONFIG: Record<RegulatoryExposureLevel, { color: string; bg: string; border: string; label: string }> = {
  CRITICAL: { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.22)",  label: "CRITICAL" },
  HIGH:     { color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.22)", label: "HIGH"     },
  MODERATE: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.22)", label: "MODERATE" },
  LOW:      { color: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.22)",  label: "LOW"      },
};

const SEVERITY_CONFIG = {
  CRITICAL: { color: "#ef4444", label: "CRITICAL" },
  HIGH:     { color: "#f97316", label: "HIGH"     },
  MODERATE: { color: "#f59e0b", label: "MODERATE" },
};

const AGENT_STATUS_CONFIG = {
  CRITICAL:  { color: "#ef4444", label: "Critical"  },
  HIGH:      { color: "#f97316", label: "High Risk" },
  MODERATE:  { color: "#f59e0b", label: "Moderate"  },
  CONTAINED: { color: "#22c55e", label: "Contained" },
};

const PRIORITY_CONFIG = {
  IMMEDIATE:  { color: "#ef4444", bg: "rgba(239,68,68,0.10)",  label: "Immediate"  },
  SHORT_TERM: { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", label: "Short-Term" },
  STRATEGIC:  { color: "#a855f7", bg: "rgba(168,85,247,0.10)", label: "Strategic"  },
};

const TREND_CONFIG: Record<TrustTrendDirection, { icon: typeof TrendingUp; color: string; label: string }> = {
  improving: { icon: TrendingUp,   color: "#22c55e", label: "Improving" },
  stable:    { icon: Minus,        color: "#f59e0b", label: "Stable"    },
  declining: { icon: TrendingDown, color: "#ef4444", label: "Declining" },
};

// ─── Framework readiness bar ──────────────────────────────────────────────────

function FrameworkBar({
  label, pct, deadline,
}: { label: string; pct: number; deadline?: string }) {
  const color = pct >= 85 ? "#22c55e" : pct >= 65 ? "#f59e0b" : "#ef4444";
  const statusLabel = pct >= 85 ? "READY" : pct >= 65 ? "IN PROGRESS" : "AT RISK";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-foreground">{label}</span>
          {deadline && (
            <span className="ml-2 text-[10px] text-muted-foreground/50">· {deadline}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: `${color}14`, border: `1px solid ${color}28`, color }}
          >
            {statusLabel}
          </span>
          <span className="w-10 text-right font-mono text-sm font-bold" style={{ color }}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, detail,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  detail?: string;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-5"
      style={{ background: `${color}06`, borderColor: `${color}18` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
          {label}
        </span>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `${color}14`, border: `1px solid ${color}22` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-black leading-none tracking-tight" style={{ color }}>
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-muted-foreground/60">{sub}</p>}
      </div>
      {detail && (
        <p className="border-t border-border/40 pt-2.5 text-[11px] leading-relaxed text-muted-foreground/50">
          {detail}
        </p>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</h2>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground/40">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExecutiveDashboardPage() {
  const { selectedTenantId, loading: tenantsLoading } = useTenants();
  const [data, setData]     = useState<ExecutiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (tenantsLoading) return;
    if (!selectedTenantId) {
      setData(MOCK);
      setIsDemo(true);
      setLoading(false);
      return;
    }

    const tenantId = selectedTenantId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/executive", {
          headers: { "x-tenant-id": tenantId },
        });
        if (res.ok) {
          const json = (await res.json()) as ExecutiveDashboard;
          if (!cancelled) { setData(json); setIsDemo(false); }
        } else {
          if (!cancelled) { setData(MOCK); setIsDemo(true); }
        }
      } catch {
        if (!cancelled) { setData(MOCK); setIsDemo(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [selectedTenantId, tenantsLoading]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72 bg-muted" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-36 rounded-2xl bg-muted" />
          <Skeleton className="h-36 rounded-2xl bg-muted" />
        </div>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl bg-muted" />)}
        </div>
        <Skeleton className="h-48 rounded-xl bg-muted" />
        <Skeleton className="h-56 rounded-xl bg-muted" />
      </div>
    );
  }

  if (!data) return null;

  const exposureCfg = EXPOSURE_CONFIG[data.regulatoryExposure];
  const trendCfg    = TREND_CONFIG[data.trustTrend];
  const TrendIcon   = trendCfg.icon;
  const govColor    = data.governanceScore >= 80 ? "#22c55e" : data.governanceScore >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)" }}
            >
              <BarChart3 className="h-4 w-4 text-[#a855f7]" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Executive Dashboard
            </h1>
            {isDemo && (
              <Badge variant="outline" className="border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b]">
                Demo Data
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            AI Governance Intelligence Report · Generated {formatDate(data.generatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/compliance">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-border text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-3.5 w-3.5" />
              Download Evidence Package
            </Button>
          </Link>
          <Link href="/dashboard/risk-center">
            <Button
              size="sm"
              className="gap-2 bg-[#a855f7] text-white hover:bg-[#9333ea]"
            >
              Operator View
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Financial exposure banner ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Potential Exposure */}
        <div
          className="relative overflow-hidden rounded-2xl border p-7"
          style={{
            background: "rgba(239,68,68,0.05)",
            borderColor: "rgba(239,68,68,0.20)",
            boxShadow: "0 0 40px rgba(239,68,68,0.07)",
          }}
        >
          <div
            className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full opacity-15"
            style={{ background: "#ef4444", filter: "blur(50px)", transform: "translate(30%, -30%)" }}
          />
          <div className="relative">
            <div className="mb-1 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#ef4444]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#ef4444]/80">
                Potential Regulatory Exposure
              </span>
            </div>
            <p
              className="mt-3 text-5xl font-black tracking-tight"
              style={{ color: "#ef4444", textShadow: "0 0 40px rgba(239,68,68,0.3)" }}
            >
              {formatUsd(data.potentialExposureUsd)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground/70">
              Estimated regulatory fine and remediation liability based on current incident profile
              and applicable framework penalties (GDPR · CCPA · EU AI Act).
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span
                className="rounded-full border px-3 py-1 text-[11px] font-bold"
                style={{ background: exposureCfg.bg, borderColor: exposureCfg.border, color: exposureCfg.color }}
              >
                {data.regulatoryExposure} EXPOSURE
              </span>
              <span className="text-[11px] text-muted-foreground/50">
                {data.blockedCount} blocked · {data.flaggedCount} flagged
              </span>
            </div>
          </div>
        </div>

        {/* Avoided Loss */}
        <div
          className="relative overflow-hidden rounded-2xl border p-7"
          style={{
            background: "rgba(34,197,94,0.05)",
            borderColor: "rgba(34,197,94,0.20)",
            boxShadow: "0 0 40px rgba(34,197,94,0.07)",
          }}
        >
          <div
            className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full opacity-15"
            style={{ background: "#22c55e", filter: "blur(50px)", transform: "translate(30%, -30%)" }}
          />
          <div className="relative">
            <div className="mb-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#22c55e]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#22c55e]/80">
                Estimated Avoided Loss
              </span>
            </div>
            <p
              className="mt-3 text-5xl font-black tracking-tight"
              style={{ color: "#22c55e", textShadow: "0 0 40px rgba(34,197,94,0.3)" }}
            >
              {formatUsd(data.avoidedLossUsd)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground/70">
              Value protected by real-time governance enforcement this period — data breach response,
              regulatory penalties, and incident remediation costs avoided.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full border border-[#22c55e]/25 bg-[#22c55e]/10 px-3 py-1 text-[11px] font-bold text-[#22c55e]">
                {data.blockedCount} ACTIONS BLOCKED
              </span>
              <span className="text-[11px] text-muted-foreground/50">
                before data reached external endpoints
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5 KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Regulatory Exposure"
          value={data.regulatoryExposure}
          sub={`${data.blockedCount} policy violations`}
          icon={ShieldAlert}
          color={exposureCfg.color}
          detail="Derived from incident profile and applicable framework penalties."
        />
        <KpiCard
          label="Compliance Readiness"
          value={`${data.complianceReadiness}%`}
          sub="Across active frameworks"
          icon={Shield}
          color={data.complianceReadiness >= 80 ? "#22c55e" : data.complianceReadiness >= 60 ? "#f59e0b" : "#ef4444"}
          detail="EU AI Act enforcement begins August 2026."
        />
        <KpiCard
          label="Agents at Risk"
          value={`${data.agentsAtRisk}`}
          sub={`of ${data.totalAgents} monitored`}
          icon={Bot}
          color={data.agentsAtRisk === 0 ? "#22c55e" : data.agentsAtRisk <= 2 ? "#f59e0b" : "#ef4444"}
          detail="Agents with ≥1 blocked action in the current period."
        />
        <KpiCard
          label="Trust Trend"
          value={trendCfg.label}
          sub={`${data.trustTrendDelta >= 0 ? "+" : ""}${data.trustTrendDelta} pts this period`}
          icon={TrendIcon}
          color={trendCfg.color}
          detail="Derived from policy violation rate and governance score trajectory."
        />
        <KpiCard
          label="Governance Score"
          value={`${data.governanceScore}`}
          sub="out of 100"
          icon={BarChart3}
          color={govColor}
          detail={`${data.totalActions.toLocaleString()} total actions evaluated.`}
        />
      </div>

      {/* ── Executive Brief ───────────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-6"
        style={{
          background: "rgba(168,85,247,0.04)",
          borderColor: "rgba(168,85,247,0.14)",
        }}
      >
        <div className="mb-4 flex items-center gap-2.5">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{ background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.28)" }}
          >
            <FileText className="h-3.5 w-3.5 text-[#a855f7]" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#a855f7]">
            Executive Brief
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground/40">
            AI Governance Intelligence · {formatDate(data.generatedAt)}
          </span>
        </div>
        <p className="text-sm leading-7 text-foreground/80">{data.executiveBrief}</p>
      </div>

      {/* ── Regulatory Framework Readiness ────────────────────────────────── */}
      <div>
        <SectionHeader
          label="Regulatory Framework Readiness"
          sub="Readiness score derived from governance metrics, policy coverage, and incident profile"
        />
        <div
          className="rounded-xl border p-6"
          style={{ background: "rgba(15,23,42,0.4)", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <FrameworkBar label="SOC 2 Type II"          pct={data.frameworks.soc2}      deadline="Q3 2026 target" />
            <FrameworkBar label="EU AI Act (2024/1689)"  pct={data.frameworks.euAiAct}   deadline="Enforced Aug 2026" />
            <FrameworkBar label="ISO 27001:2022"         pct={data.frameworks.iso27001}  deadline="Q1 2027 target" />
            <FrameworkBar label="NIST AI RMF"            pct={data.frameworks.nistAiRmf} />
          </div>
          <div
            className="mt-5 border-t pt-4 text-[11px] leading-relaxed text-muted-foreground/40"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}
          >
            READY ≥ 85% · IN PROGRESS 65–84% · AT RISK &lt; 65% · Scores update with each governance cycle.
          </div>
        </div>
      </div>

      {/* ── Agent Risk Summary ────────────────────────────────────────────── */}
      <div>
        <SectionHeader
          label="Agent Risk Summary"
          sub="Agents ranked by cumulative violation severity — requires leadership attention above HIGH"
        />
        <div
          className="overflow-hidden rounded-xl border"
          style={{ background: "rgba(15,23,42,0.4)", borderColor: "rgba(255,255,255,0.06)" }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-12 gap-4 border-b px-5 py-3"
            style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.15)" }}
          >
            {["Agent", "Framework", "Status", "Blocked", "Flagged", "Risk Score"].map((h) => (
              <span
                key={h}
                className={`text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 ${
                  h === "Agent" ? "col-span-4" : h === "Framework" ? "col-span-2" : "col-span-1 text-center"
                }`}
              >
                {h}
              </span>
            ))}
            <span className="col-span-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 text-center">Action</span>
          </div>

          {data.topRiskAgents.map((agent, i) => {
            const statusCfg = AGENT_STATUS_CONFIG[agent.status];
            return (
              <div
                key={agent.name}
                className="grid grid-cols-12 gap-4 items-center px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                style={{
                  borderBottom: i < data.topRiskAgents.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                <div className="col-span-4 flex items-center gap-2.5">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-muted-foreground"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground/60">—</span>
                </div>
                <div className="col-span-1 flex justify-center">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: `${statusCfg.color}12`,
                      border: `1px solid ${statusCfg.color}28`,
                      color: statusCfg.color,
                    }}
                  >
                    {statusCfg.label}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <span className={`font-mono text-sm font-bold ${agent.blockedCount > 0 ? "text-[#ef4444]" : "text-muted-foreground/40"}`}>
                    {agent.blockedCount}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <span className={`font-mono text-sm ${agent.flaggedCount > 0 ? "text-[#f59e0b]" : "text-muted-foreground/40"}`}>
                    {agent.flaggedCount}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <span
                    className="font-mono text-sm font-bold"
                    style={{ color: statusCfg.color }}
                  >
                    {agent.riskScore}
                  </span>
                </div>
                <div className="col-span-1 flex justify-center">
                  <Link href="/dashboard/agents">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      View
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recent High-Risk Incidents ────────────────────────────────────── */}
      <div>
        <SectionHeader
          label="Recent High-Risk Incidents"
          sub="Incidents requiring leadership awareness — full investigation available in Threat Timeline"
        />
        <div className="space-y-3">
          {data.recentIncidents.map((inc, i) => {
            const sev = SEVERITY_CONFIG[inc.severity];
            return (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-start"
                style={{
                  background: `${sev.color}04`,
                  borderColor: `${sev.color}18`,
                }}
              >
                {/* Severity + date */}
                <div className="flex shrink-0 flex-col gap-1 sm:w-36">
                  <span
                    className="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                    style={{ background: `${sev.color}14`, border: `1px solid ${sev.color}28`, color: sev.color }}
                  >
                    {sev.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground/50">
                    {formatShortDate(inc.timestamp)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{inc.agentName}</span>
                    <span className="rounded border border-border/50 px-1.5 py-0.5 text-[10px] text-muted-foreground/60">
                      {inc.actionType.replace(/_/g, " ")}
                    </span>
                    <span className="rounded border border-border/50 px-1.5 py-0.5 text-[10px] text-muted-foreground/60">
                      {inc.policyArea}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/70">{inc.summary}</p>
                </div>

                {/* Estimated exposure */}
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                    Est. Exposure
                  </p>
                  <p className="font-mono text-base font-bold" style={{ color: sev.color }}>
                    {formatUsd(inc.estimatedExposureUsd)}
                  </p>
                  <Link href="/dashboard/threats">
                    <button className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                      Investigate <ArrowUpRight className="h-2.5 w-2.5" />
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Leadership Recommendations ────────────────────────────────────── */}
      <div>
        <SectionHeader
          label="Leadership Recommendations"
          sub="Prioritized actions for executive and board consideration"
        />
        <div className="space-y-3">
          {data.recommendations.map((rec, i) => {
            const pCfg = PRIORITY_CONFIG[rec.priority];
            return (
              <div
                key={i}
                className="rounded-xl border p-5"
                style={{ background: "rgba(15,23,42,0.4)", borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  {/* Number */}
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black"
                    style={{ background: `${pCfg.color}14`, border: `1px solid ${pCfg.color}28`, color: pCfg.color }}
                  >
                    {i + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{rec.title}</h3>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: pCfg.bg, color: pCfg.color }}
                      >
                        {pCfg.label}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/65">{rec.description}</p>
                  </div>

                  {/* Impact */}
                  <div className="shrink-0 text-right">
                    {rec.estimatedImpactUsd !== null ? (
                      <>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                          Est. Impact
                        </p>
                        <p className="font-mono text-base font-bold text-[#22c55e]">
                          {formatUsd(rec.estimatedImpactUsd)}
                        </p>
                        <p className="text-[10px] text-muted-foreground/40">{rec.impactLabel}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                          Impact
                        </p>
                        <p className="mt-0.5 max-w-[140px] text-right text-[11px] leading-tight text-muted-foreground/50">
                          {rec.impactLabel}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border px-6 py-4"
        style={{ background: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.04)" }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground/40">
            AgentWitness Executive Dashboard · Confidential · For board and C-suite distribution only ·
            Generated {new Date(data.generatedAt).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })}
          </p>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/risk-center" className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              Operator View →
            </Link>
            <Link href="/dashboard/compliance" className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              Compliance Report →
            </Link>
            <Link href="/dashboard/audit-log" className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              Audit Log →
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
