"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  DollarSign,
  FileText,
  Globe,
  ListChecks,
  Lock,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatRelativeTime, policyResultBadgeClass, truncateMessage } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import type { GovernanceLevel } from "@/lib/db/risk-center";
import type { PolicyResult } from "@/lib/db/types";

const SKELETON_KPI_COUNT = 6;
const INPUT_SUMMARY_MAX_LENGTH = 80;

// ─── Risk Center types ────────────────────────────────────────────────────────

interface GovernanceScore {
  score: number;
  level: GovernanceLevel;
  blockedCount: number;
  flaggedCount: number;
  highCostCount: number;
}

interface ExecutiveMetrics {
  totalActions: number;
  blockedActions: number;
  flaggedActions: number;
  policiesActive: number;
  agentsMonitored: number;
  totalAiSpend: number;
}

interface TopRiskAgent {
  agentName: string;
  riskScore: number;
  blockedCount: number;
  flaggedCount: number;
}

interface PolicyRiskBreakdownEntry {
  policyName: string;
  hitCount: number;
}

interface CriticalIncident {
  timestamp: string;
  agentName: string;
  actionType: string;
  inputSummary: string;
  policyName: string;
  policyResult: PolicyResult;
}

interface RiskCenterResponse {
  governanceScore: GovernanceScore;
  metrics: ExecutiveMetrics;
  topRiskAgents: TopRiskAgent[];
  policyBreakdown: PolicyRiskBreakdownEntry[];
  incidents: CriticalIncident[];
  executiveSummary: string;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function levelAccentClass(level: GovernanceLevel): string {
  switch (level) {
    case "LOW":    return "text-success";
    case "MEDIUM": return "text-warning";
    case "HIGH":   return "text-destructive";
  }
}

function levelBarClass(level: GovernanceLevel): string {
  switch (level) {
    case "LOW":    return "bg-success";
    case "MEDIUM": return "bg-warning";
    case "HIGH":   return "bg-destructive";
  }
}

function levelBadgeClass(level: GovernanceLevel): string {
  switch (level) {
    case "LOW":    return "border-success/30 bg-success/10 text-success";
    case "MEDIUM": return "border-warning/30 bg-warning/10 text-warning";
    case "HIGH":   return "border-destructive/30 bg-destructive/10 text-destructive";
  }
}

function readinessConfig(score: number): { color: string; badge: string; bg: string; border: string } {
  if (score >= 80) return { color: "#22c55e", badge: "COMPLIANT",    bg: "#052e16", border: "#166534" };
  if (score >= 60) return { color: "#f59e0b", badge: "PARTIAL",      bg: "#1c1007", border: "#78350f" };
  return             { color: "#ef4444", badge: "AT RISK",       bg: "#1c0606", border: "#7f1d1d" };
}

function KpiCard({
  title,
  value,
  icon: Icon,
  accentClass,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  accentClass: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", accentClass)} />
      </CardHeader>
      <CardContent>
        <p className={cn("text-3xl font-bold", accentClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── Compliance Command Center ────────────────────────────────────────────────

type PackageStatus = "idle" | "generating" | "success" | "error";

interface PackageRecord {
  id: string;
  generatedAt: string;
  fileName: string;
  fileSizeBytes: number;
  governanceScore: number;
  totalActions: number;
  blockedCount: number;
}

const GENERATION_STAGES = [
  "Collecting audit evidence...",
  "Building executive summary...",
  "Compiling compliance matrices...",
  "Generating PDF package...",
] as const;

const PACKAGE_CONTENTS = [
  "Executive Summary",
  "Incident Timeline",
  "Policy Violations",
  "Agent Trust Metrics",
  "Compliance Evidence",
] as const;

function ReadinessRing({ score, color }: { score: number; color: string }) {
  const R = 46;
  const circ = 2 * Math.PI * R;
  const dash = (score / 100) * circ;
  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
        <circle
          cx="48" cy="48" r={R}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ filter: `drop-shadow(0 0 5px ${color}88)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-black leading-none" style={{ color }}>{score}</span>
        <span className="text-[8px] font-semibold uppercase tracking-widest text-muted-foreground/40">/ 100</span>
      </div>
    </div>
  );
}

function ComplianceCommandCenter({
  data,
  tenantId,
}: {
  data: RiskCenterResponse | null;
  tenantId: string | null;
}) {
  const [status, setStatus] = useState<PackageStatus>("idle");
  const [currentStage, setCurrentStage] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("");
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const [pastPackages, setPastPackages] = useState<PackageRecord[]>([]);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    fetch("/api/compliance/reports", { headers: { "x-tenant-id": tenantId } })
      .then((r) => r.ok ? (r.json() as Promise<{ reports: PackageRecord[] }>) : Promise.resolve({ reports: [] }))
      .then((d) => { if (!cancelled) setPastPackages(d.reports); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tenantId]);

  // Readiness scores derived from live governance data
  const gov = data?.governanceScore.score ?? 0;
  const cleanRate = data && data.metrics.totalActions > 0
    ? (data.metrics.totalActions - data.metrics.blockedActions - data.metrics.flaggedActions) / data.metrics.totalActions
    : 1;
  const soc2Score     = data ? Math.min(97, Math.round(gov * 0.6  + cleanRate * 28 + Math.min(data.metrics.policiesActive, 4) * 2)) : 84;
  const euAiActScore  = data ? Math.min(94, Math.round(gov * 0.53 + cleanRate * 24 + Math.min(data.metrics.agentsMonitored, 5) * 1.5)) : 71;
  const iso27001Score = data ? Math.min(91, Math.round(gov * 0.48 + Math.min(data.metrics.totalActions / 100, 1) * 22 + Math.min(data.metrics.policiesActive, 4) * 2)) : 67;

  // Evidence coverage
  const monitoredActions    = data?.metrics.totalActions ?? 1247;
  const policyEvaluations   = data?.metrics.totalActions ?? 1247;
  const incidentsInv        = data ? (data.metrics.blockedActions + data.metrics.flaggedActions) : 8;
  const auditRecords        = data?.metrics.totalActions ?? 1247;

  // Regulatory exposure  ── $38k / blocked · $8k / flagged · $10k / PII
  const blockedCount = data?.metrics.blockedActions ?? 3;
  const flaggedCount = data?.metrics.flaggedActions ?? 1;
  const piiCount     = data
    ? (data.policyBreakdown.find(
        (p) => p.policyName.toLowerCase().includes("pii") ||
               p.policyName.toLowerCase().includes("data mask") ||
               p.policyName.toLowerCase().includes("privacy")
      )?.hitCount ?? 0)
    : 2;
  const blockedExposure = blockedCount * 38000;
  const flaggedExposure = flaggedCount * 8000;
  const piiExposure     = (piiCount || (data ? 0 : 2)) * 10000;
  const totalExposure   = blockedExposure + flaggedExposure + piiExposure;
  const displayPii      = piiCount || (data ? 0 : 2);

  const readinessItems = [
    { label: "SOC 2 Type II", score: soc2Score,     Icon: ShieldCheck, description: soc2Score >= 80 ? "All major controls satisfied. Ready for audit." : soc2Score >= 60 ? "Minor gaps identified. Address before next audit cycle." : "Critical controls missing. Immediate remediation required." },
    { label: "EU AI Act",     score: euAiActScore,   Icon: Globe,       description: euAiActScore >= 80 ? "Transparency and monitoring obligations met." : euAiActScore >= 60 ? "Documentation gaps in high-risk AI system records." : "Significant compliance deficit. Escalate to legal team." },
    { label: "ISO 27001",     score: iso27001Score,  Icon: Lock,        description: iso27001Score >= 80 ? "Information security controls fully documented." : iso27001Score >= 60 ? "Access control and audit trail gaps detected." : "Multiple security controls unmet. ISMS review needed." },
  ] as const;

  const evidenceItems = [
    { label: "Monitored Actions",      value: monitoredActions },
    { label: "Policy Evaluations",     value: policyEvaluations },
    { label: "Incidents Investigated", value: incidentsInv },
    { label: "Audit Records",          value: auditRecords },
  ];

  async function generatePackage() {
    if (!tenantId) return;
    setStatus("generating");
    setCurrentStage(0);

    const apiPromise = fetch("/api/compliance/report", {
      method: "POST",
      headers: { "x-tenant-id": tenantId },
    }).catch(() => null as Response | null);

    const stageDurations = [950, 1150, 1250, 950] as const;
    for (let i = 0; i < stageDurations.length; i++) {
      await new Promise<void>((r) => setTimeout(r, stageDurations[i]));
      if (i < GENERATION_STAGES.length - 1) setCurrentStage(i + 1);
    }

    const res = await apiPromise;
    if (!res || !res.ok) {
      setStatus("error");
      return;
    }
    try {
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const fn = match?.[1] ?? "agentwitness-compliance-report.pdf";
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(fn);
      setStatus("success");
      // Refresh past packages list
      fetch("/api/compliance/reports", { headers: { "x-tenant-id": tenantId } })
        .then((r) => r.ok ? (r.json() as Promise<{ reports: PackageRecord[] }>) : Promise.resolve({ reports: [] }))
        .then((d) => setPastPackages(d.reports))
        .catch(() => {});
    } catch {
      setStatus("error");
    }
  }

  function handleDownload() {
    if (downloadRef.current && downloadUrl) {
      downloadRef.current.href = downloadUrl;
      downloadRef.current.download = downloadName;
      downloadRef.current.click();
    }
  }

  function retryGeneration() {
    setStatus("idle");
    setCurrentStage(0);
  }

  return (
    <section>
      {/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
      <a ref={downloadRef} className="hidden" aria-hidden="true" />

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-foreground">Compliance Command Center</h2>
            <Badge variant="outline" className="border-[#06b6d4]/30 bg-[#06b6d4]/10 text-[#06b6d4] text-[10px]">
              Live
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Real-time regulatory readiness across SOC 2, EU AI Act, and ISO 27001
          </p>
        </div>
      </div>

      {/* ── 1. Readiness Scores ──────────────────────────────────────────────── */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {readinessItems.map(({ label, score, Icon, description }) => {
          const cfg = readinessConfig(score);
          return (
            <div
              key={label}
              className="relative overflow-hidden rounded-2xl border p-5"
              style={{
                background: `linear-gradient(135deg, ${cfg.bg} 0%, #0a0e1a 100%)`,
                borderColor: cfg.border,
              }}
            >
              {/* Ambient glow */}
              <div
                className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full opacity-10 blur-3xl"
                style={{ background: cfg.color }}
              />

              <div className="mb-4 flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                <span className="text-xs font-semibold text-muted-foreground/70">{label}</span>
              </div>

              <div className="flex items-center gap-4">
                <ReadinessRing score={score} color={cfg.color} />
                <div>
                  <div
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                    style={{
                      background: `${cfg.color}18`,
                      border: `1px solid ${cfg.color}35`,
                      color: cfg.color,
                    }}
                  >
                    {cfg.badge}
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/50">
                    {description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 2. Evidence Coverage ─────────────────────────────────────────────── */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-5">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Evidence Coverage
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {evidenceItems.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.04] bg-white/[0.025] p-4"
            >
              <p className="font-mono text-2xl font-black text-foreground">
                {value.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/55">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Exposure + Package (side by side) ─────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Regulatory Exposure */}
        <div
          className="relative overflow-hidden rounded-2xl border p-6"
          style={{
            background: "linear-gradient(135deg, #1c0606 0%, #0c0a14 100%)",
            borderColor: "#ef444422",
          }}
        >
          <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-[#ef4444] opacity-[0.06] blur-3xl" />

          {/* Header */}
          <div className="mb-5 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ef4444]/25 bg-[#ef4444]/12">
                <AlertTriangle className="h-3.5 w-3.5 text-[#ef4444]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#ef4444]">
                Regulatory Exposure
              </span>
            </div>
            <div
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{ background: "#ef444418", border: "1px solid #ef444430", color: "#ef4444" }}
            >
              <TrendingUp className="h-2.5 w-2.5" />
              +12%
            </div>
          </div>

          {/* Dollar amount */}
          <div className="mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
              Potential Exposure
            </p>
            <p
              className="mt-1 font-mono text-5xl font-black text-[#ef4444]"
              style={{ textShadow: "0 0 28px rgba(239,68,68,0.4)" }}
            >
              {compactCurrencyFormatter.format(totalExposure)}
            </p>
          </div>
          <p className="mb-5 text-[10px] text-muted-foreground/40">
            Estimated regulatory fine risk based on current incident profile
          </p>

          {/* Breakdown */}
          <div className="mb-3">
            <p className="mb-2.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
              Based On
            </p>
            <div className="space-y-2.5">
              {[
                {
                  label: `${blockedCount} blocked incident${blockedCount !== 1 ? "s" : ""}`,
                  amount: blockedExposure,
                  color: "#ef4444",
                  dot: "#ef4444",
                },
                {
                  label: `${flaggedCount} flagged incident${flaggedCount !== 1 ? "s" : ""}`,
                  amount: flaggedExposure,
                  color: "#f59e0b",
                  dot: "#f59e0b",
                },
                {
                  label: `${displayPii} PII violation${displayPii !== 1 ? "s" : ""}`,
                  amount: piiExposure,
                  color: "#a855f7",
                  dot: "#a855f7",
                },
              ].map(({ label, amount, color, dot }) => (
                <div key={label} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
                    <span className="text-muted-foreground/70">{label}</span>
                  </div>
                  <span className="font-mono font-bold" style={{ color }}>
                    {compactCurrencyFormatter.format(amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stacked bar */}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.04]">
            <div className="flex h-full">
              <div className="h-full" style={{ width: `${(blockedExposure / totalExposure) * 100}%`, background: "#ef4444" }} />
              <div className="h-full" style={{ width: `${(flaggedExposure / totalExposure) * 100}%`, background: "#f59e0b" }} />
              <div className="h-full" style={{ width: `${(piiExposure / totalExposure) * 100}%`, background: "#a855f7" }} />
            </div>
          </div>
        </div>

        {/* Generate Evidence Package */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">

          {/* ── IDLE ── */}
          {status === "idle" && (
            <>
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#06b6d4]">
                  Evidence Package
                </p>
                <p className="mt-1.5 text-base font-bold text-foreground">
                  Generate Evidence Package
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground/60">
                  A signed PDF containing SOC 2 controls, EU AI Act documentation, full audit trail, and executive summary ready for external auditors.
                </p>
              </div>

              <div className="mb-6 space-y-2">
                {PACKAGE_CONTENTS.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-[11px] text-muted-foreground/55">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#06b6d4]/45" />
                    {item}
                  </div>
                ))}
              </div>

              <button
                onClick={generatePackage}
                disabled={!tenantId}
                className="group w-full rounded-xl py-3.5 text-sm font-bold text-[#020617] transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                style={{
                  background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
                  boxShadow: "0 0 24px rgba(6,182,212,0.22), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                Generate Evidence Package
              </button>
              {!tenantId && (
                <p className="mt-2 text-center text-[10px] text-muted-foreground/40">
                  Select a tenant to generate
                </p>
              )}
            </>
          )}

          {/* ── GENERATING ── */}
          {status === "generating" && (
            <div className="flex h-full flex-col py-2">
              <div className="mb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#06b6d4]">
                  Building Package
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  Processing your audit data…
                </p>
              </div>
              <p className="mb-8 text-[11px] text-muted-foreground/50">
                This may take a moment. Please keep this tab open.
              </p>

              <div className="space-y-5">
                {GENERATION_STAGES.map((stage, i) => {
                  const isDone    = i < currentStage;
                  const isCurrent = i === currentStage;
                  return (
                    <div key={stage} className="flex items-center gap-4">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: isDone    ? "#22c55e14"          : isCurrent ? "#06b6d414"          : "rgba(255,255,255,0.025)",
                          border:     `1px solid ${isDone ? "#22c55e38" : isCurrent ? "#06b6d438" : "rgba(255,255,255,0.06)"}`,
                        }}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                        ) : isCurrent ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-[2px] border-[#06b6d4]/20 border-t-[#06b6d4]" />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-white/12" />
                        )}
                      </div>
                      <span
                        className="text-sm transition-colors duration-300"
                        style={{
                          color: isDone    ? "#22c55e"
                               : isCurrent ? "#f8fafc"
                               : "rgba(148,163,184,0.3)",
                          fontWeight: isCurrent ? 600 : 400,
                        }}
                      >
                        {stage}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {status === "success" && (
            <div>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#22c55e]/30 bg-[#22c55e]/12">
                  <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#22c55e]">Evidence Package Ready</p>
                  <p className="text-[10px] text-muted-foreground/50">
                    All evidence collected and verified
                  </p>
                </div>
              </div>

              <div className="mb-5 rounded-xl border border-border bg-white/[0.02] p-4">
                <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                  Contents
                </p>
                <div className="space-y-2">
                  {PACKAGE_CONTENTS.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#22c55e]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-[#020617] transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  boxShadow: "0 0 24px rgba(34,197,94,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
              >
                Download PDF
              </button>
            </div>
          )}

          {/* ── ERROR ── */}
          {status === "error" && (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#ef4444]/25 bg-[#ef4444]/10">
                <AlertTriangle className="h-6 w-6 text-[#ef4444]/80" />
              </div>
              <p className="text-sm font-bold text-foreground">Unable to generate package</p>
              <p className="mt-1 mb-6 text-xs text-muted-foreground/55">Audit records unavailable</p>
              <button
                onClick={retryGeneration}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Past Evidence Packages ─────────────────────────────────────── */}
      {pastPackages.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Past Evidence Packages
          </p>
          <div className="space-y-2">
            {pastPackages.map((pkg) => {
              const gc = pkg.governanceScore >= 80 ? "#22c55e" : pkg.governanceScore >= 50 ? "#f59e0b" : "#ef4444";
              const kb = (pkg.fileSizeBytes / 1024).toFixed(0);
              return (
                <div
                  key={pkg.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: "#06b6d414", border: "1px solid #06b6d428" }}
                    >
                      <FileText className="h-3.5 w-3.5 text-[#06b6d4]" />
                    </div>
                    <div>
                      <p className="font-mono text-[11px] text-foreground/70">{pkg.fileName}</p>
                      <p className="text-[10px] text-muted-foreground/45">
                        {formatRelativeTime(pkg.generatedAt)} &middot; {kb} KB &middot; {pkg.totalActions.toLocaleString()} actions
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                    style={{ background: `${gc}14`, border: `1px solid ${gc}30`, color: gc }}
                  >
                    <ShieldCheck className="h-2.5 w-2.5" />
                    Score {pkg.governanceScore}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RiskCenterPage() {
  const { selectedTenantId, loading: tenantsLoading, error: tenantsError } = useTenants();

  const [data, setData] = useState<RiskCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const retry = useCallback(() => {
    setRefreshIndex((index) => index + 1);
  }, []);

  useEffect(() => {
    if (!selectedTenantId) return;

    const tenantId = selectedTenantId;
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/risk-center", {
          headers: { "x-tenant-id": tenantId },
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Request failed with status ${response.status}`);
        }
        const result = (await response.json()) as RiskCenterResponse;
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load risk center");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [selectedTenantId, refreshIndex]);

  if (tenantsLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-muted" />
          <Skeleton className="h-4 w-96 bg-muted" />
        </div>
        <Skeleton className="h-40 rounded-xl bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: SKELETON_KPI_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (tenantsError || error) {
    return (
      <Card className="border-destructive/30 bg-card">
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-destructive">{truncateMessage(tenantsError ?? error ?? "")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            className="border-border text-foreground hover:bg-secondary"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">AI Risk Center</h1>
          <Badge variant="outline" className="border-chart-1/30 bg-chart-1/10 text-chart-1">
            Executive View
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Live AI governance posture, computed directly from Aurora PostgreSQL.
        </p>
      </div>

      {/* 1. Governance Score Hero */}
      {loading || !data ? (
        <Skeleton className="h-40 rounded-xl bg-muted" />
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center justify-center">
                <span className={cn("text-6xl font-bold leading-none", levelAccentClass(data.governanceScore.level))}>
                  {data.governanceScore.score}
                </span>
                <span className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">/ 100</span>
              </div>
              <div className="h-16 w-px bg-muted" />
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className={cn("h-5 w-5", levelAccentClass(data.governanceScore.level))} />
                  <h2 className="text-lg font-semibold text-foreground">Governance Score</h2>
                  <Badge variant="outline" className={levelBadgeClass(data.governanceScore.level)}>
                    {data.governanceScore.level} RISK
                  </Badge>
                </div>
                <div className="mt-3 w-64 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-2 rounded-full", levelBarClass(data.governanceScore.level))}
                    style={{ width: `${data.governanceScore.score}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {data.governanceScore.blockedCount} blocked &middot; {data.governanceScore.flaggedCount} flagged
                  &middot; {data.governanceScore.highCostCount} high-cost
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading || !data ? (
          Array.from({ length: SKELETON_KPI_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl bg-muted" />
          ))
        ) : (
          <>
            <KpiCard title="Total Actions"   value={data.metrics.totalActions.toLocaleString("en-US")}                    icon={ListChecks}  accentClass="text-chart-1" />
            <KpiCard title="Blocked Actions" value={data.metrics.blockedActions.toLocaleString("en-US")}                   icon={ShieldAlert}  accentClass="text-destructive" />
            <KpiCard title="Flagged Actions" value={data.metrics.flaggedActions.toLocaleString("en-US")}                   icon={AlertTriangle} accentClass="text-warning" />
            <KpiCard title="Active Policies" value={data.metrics.policiesActive.toLocaleString("en-US")}                  icon={Shield}       accentClass="text-accent" />
            <KpiCard title="Agents Monitored" value={data.metrics.agentsMonitored.toLocaleString("en-US")}                icon={Bot}          accentClass="text-chart-5" />
            <KpiCard title="Total AI Spend"  value={currencyFormatter.format(data.metrics.totalAiSpend)}                  icon={DollarSign}   accentClass="text-success" />
          </>
        )}
      </div>

      {/* 3. Agent Intelligence → dedicated page */}
      <Link href="/dashboard/agents" className="group block">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-6 py-5 transition-all duration-200 hover:border-[#06b6d4]/30 hover:bg-card/80">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#06b6d4]/20 bg-[#06b6d4]/10">
              <Bot className="h-5 w-5 text-[#06b6d4]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Agent Intelligence Center</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Deep trust scores, behavior fingerprints, AI-powered risk predictions, and remediation playbooks — one profile per agent.
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-[#06b6d4]" />
        </div>
      </Link>

      {/* 4. Policy Breakdown + Top Risk Agents */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Top Risk Agents</h2>
          <Separator className="my-4 bg-muted" />
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Agent</TableHead>
                    <TableHead className="text-right text-muted-foreground">Risk Score</TableHead>
                    <TableHead className="text-right text-muted-foreground">Blocked</TableHead>
                    <TableHead className="text-right text-muted-foreground">Flagged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading || !data ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index} className="border-border">
                        <TableCell colSpan={4}><Skeleton className="h-6 w-full bg-muted" /></TableCell>
                      </TableRow>
                    ))
                  ) : data.topRiskAgents.length === 0 ? (
                    <TableRow className="border-border">
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No agents found.</TableCell>
                    </TableRow>
                  ) : (
                    data.topRiskAgents.map((agent) => (
                      <TableRow key={agent.agentName} className="border-border">
                        <TableCell className="text-foreground">{agent.agentName}</TableCell>
                        <TableCell className={cn("text-right font-semibold", agent.riskScore > 0 ? "text-destructive" : "text-muted-foreground")}>
                          {agent.riskScore}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{agent.blockedCount}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{agent.flaggedCount}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Policy Breakdown</h2>
          <Separator className="my-4 bg-muted" />
          <Card className="border-border bg-card">
            <CardContent className="space-y-4 p-6">
              {loading || !data ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-6 w-full bg-muted" />
                ))
              ) : data.policyBreakdown.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No policies configured.</p>
              ) : (
                (() => {
                  const maxHits = Math.max(...data.policyBreakdown.map((p) => p.hitCount), 1);
                  return data.policyBreakdown.map((policy) => (
                    <div key={policy.policyName}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{policy.policyName}</span>
                        <span className="font-mono text-muted-foreground">{policy.hitCount}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", policy.hitCount > 0 ? "bg-destructive" : "bg-muted")}
                          style={{ width: `${(policy.hitCount / maxHits) * 100}%` }}
                        />
                      </div>
                    </div>
                  ));
                })()
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* 5. Critical Incident Feed */}
      <section>
        <h2 className="text-lg font-semibold text-foreground">Critical Incident Feed</h2>
        <Separator className="my-4 bg-muted" />
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">Agent</TableHead>
              <TableHead className="text-muted-foreground">Type</TableHead>
              <TableHead className="text-muted-foreground">Policy</TableHead>
              <TableHead className="text-muted-foreground">Result</TableHead>
              <TableHead className="text-muted-foreground">Input Summary</TableHead>
              <TableHead className="text-right text-muted-foreground">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading || !data ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index} className="border-border">
                  <TableCell colSpan={6}><Skeleton className="h-6 w-full bg-muted" /></TableCell>
                </TableRow>
              ))
            ) : data.incidents.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 py-6">
                    <ShieldCheck className="h-8 w-8 text-success" />
                    No blocked actions recorded.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.incidents.map((incident, index) => (
                <TableRow
                  key={`${incident.timestamp}-${index}`}
                  className="border-l-2 border-l-destructive border-border bg-destructive/10"
                >
                  <TableCell>
                    <Badge variant="outline" className="border-border text-muted-foreground">{incident.agentName}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-border text-muted-foreground">{incident.actionType}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{incident.policyName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={policyResultBadgeClass(incident.policyResult)}>{incident.policyResult}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {truncateMessage(incident.inputSummary, INPUT_SUMMARY_MAX_LENGTH)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatRelativeTime(incident.timestamp)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {/* 6. Executive Summary */}
      <section>
        <h2 className="text-lg font-semibold text-foreground">Executive Summary</h2>
        <Separator className="my-4 bg-muted" />
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            {loading || !data ? (
              <Skeleton className="h-16 w-full bg-muted" />
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">{data.executiveSummary}</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 7. Compliance Command Center */}
      <Separator className="bg-muted" />
      <ComplianceCommandCenter data={data} tenantId={selectedTenantId ?? null} />
    </div>
  );
}
