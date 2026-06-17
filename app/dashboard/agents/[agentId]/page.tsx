"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  DollarSign,
  EyeOff,
  Minus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenants } from "@/lib/tenant";
import type { AgentTrustDetail, RiskTrend, ViolationEntry } from "@/lib/db/trust-scores";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentProfile extends AgentTrustDetail {
  violations: ViolationEntry[];
  lastIncidentAt: string | null;
  lastIncidentActionType: string | null;
}

interface BehaviorFingerprint {
  compliance: number;
  costControl: number;
  dataAccessSafety: number;
  toolUsageSafety: number;
  reliability: number;
  autonomyRisk: number;
}

interface Prediction {
  projected: number;
  confidence: number;
  criticalProbability: number;
  trendSlope: number;
}

interface Recommendation {
  priority: number;
  action: string;
  detail: string;
  impact: number;
  icon: "shield" | "eye" | "dollar" | "check" | "user" | "zap";
}

// ── Constants ─────────────────────────────────────────────────────────────────

type TrustLevel = "TRUSTED" | "WATCHLIST" | "HIGH RISK" | "CRITICAL";

const TRUST_LEVEL_CONFIG: Record<
  TrustLevel,
  { color: string; bg: string; border: string; glow: string; Icon: typeof ShieldCheck }
> = {
  TRUSTED:    { color: "#22c55e", bg: "#052e16", border: "#166534", glow: "#22c55e33", Icon: ShieldCheck },
  WATCHLIST:  { color: "#f59e0b", bg: "#1c1007", border: "#78350f", glow: "#f59e0b33", Icon: ShieldAlert },
  "HIGH RISK":{ color: "#ef4444", bg: "#1c0606", border: "#7f1d1d", glow: "#ef444433", Icon: ShieldAlert },
  CRITICAL:   { color: "#dc2626", bg: "#1c0202", border: "#991b1b", glow: "#dc262633", Icon: AlertTriangle },
};

const POLICY_ICON: Record<string, typeof Shield> = {
  domain_block: Shield,
  data_masking:  EyeOff,
  cost_limit:    DollarSign,
};

const POLICY_COLOR: Record<string, string> = {
  domain_block: "#ef4444",
  data_masking:  "#f59e0b",
  cost_limit:    "#a855f7",
  unknown:       "#64748b",
};

const REC_ICON_MAP: Record<Recommendation["icon"], typeof Shield> = {
  shield: Shield,
  eye:    EyeOff,
  dollar: DollarSign,
  check:  CheckCircle2,
  user:   UserCheck,
  zap:    Zap,
};

// ── Pure computation helpers ──────────────────────────────────────────────────

function getTrustLevel(score: number): TrustLevel {
  if (score >= 80) return "TRUSTED";
  if (score >= 60) return "WATCHLIST";
  if (score >= 40) return "HIGH RISK";
  return "CRITICAL";
}

function trendLabel(trend: RiskTrend) {
  return trend === "improving" ? "Improving" : trend === "degrading" ? "Declining" : "Stable";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 };
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let ssxy = 0, ssxx = 0, ssyy = 0;
  for (let i = 0; i < n; i++) {
    ssxy += (i - xMean) * (values[i] - yMean);
    ssxx += (i - xMean) ** 2;
    ssyy += (values[i] - yMean) ** 2;
  }
  const slope = ssxx === 0 ? 0 : ssxy / ssxx;
  const intercept = yMean - slope * xMean;
  const r2 = ssyy === 0 ? 1 : Math.max(0, (ssxy * ssxy) / (ssxx * ssyy));
  return { slope, intercept, r2 };
}

function computePrediction(profile: AgentProfile): Prediction {
  const scores = profile.trendData.map((d) => d.trustScore);
  if (scores.length < 3) {
    return {
      projected: profile.trustScore,
      confidence: 40,
      criticalProbability: profile.trustScore < 50 ? 55 : 5,
      trendSlope: 0,
    };
  }
  const { slope, intercept, r2 } = linearRegression(scores);
  const n = scores.length;
  const projected = Math.max(0, Math.min(100, Math.round(slope * (n + 7) + intercept)));
  const confidence = Math.min(95, Math.round(r2 * 100));
  let criticalProbability: number;
  if (projected < 40) {
    criticalProbability = Math.round(confidence * 0.75 + 25);
  } else if (projected < 60) {
    criticalProbability = Math.round((1 - (projected - 40) / 20) * confidence * 0.35 + 5);
  } else {
    criticalProbability = Math.max(2, Math.round((1 - confidence / 100) * 12));
  }
  return {
    projected,
    confidence,
    criticalProbability: Math.min(95, criticalProbability),
    trendSlope: Math.round(slope * 10) / 10,
  };
}

function computeFingerprint(profile: AgentProfile): BehaviorFingerprint {
  const { totalActions, complianceScore, violations } = profile;
  const base = totalActions > 0 ? 1 / totalActions : 0;
  const costV   = violations.find((v) => v.ruleType === "cost_limit");
  const dataV   = violations.find((v) => v.ruleType === "data_masking");
  const domainV = violations.find((v) => v.ruleType === "domain_block");
  const costTotal   = (costV?.blockedCount   ?? 0) + (costV?.flaggedCount   ?? 0);
  const dataTotal   = (dataV?.blockedCount   ?? 0) + (dataV?.flaggedCount   ?? 0);
  const domainTotal = (domainV?.blockedCount ?? 0) + (domainV?.flaggedCount ?? 0);
  return {
    compliance:      Math.round(complianceScore),
    costControl:     Math.max(0, Math.round(100 - costTotal   * base * 500)),
    dataAccessSafety:Math.max(0, Math.round(100 - dataTotal   * base * 500)),
    toolUsageSafety: Math.max(0, Math.round(100 - domainTotal * base * 400)),
    reliability:     totalActions > 0 ? Math.round((profile.allowedCount / totalActions) * 100) : 100,
    autonomyRisk:    Math.max(0, Math.round(100 - profile.blockedCount * base * 350)),
  };
}

function computeRecommendations(profile: AgentProfile): Recommendation[] {
  const recs: Recommendation[] = [];
  const domainV = profile.violations.find((v) => v.ruleType === "domain_block");
  const dataV   = profile.violations.find((v) => v.ruleType === "data_masking");
  const costV   = profile.violations.find((v) => v.ruleType === "cost_limit");

  if (domainV && domainV.blockedCount > 0) {
    recs.push({
      priority: recs.length + 1,
      action: "Restrict external API access",
      detail: `${domainV.blockedCount} domain block violations detected. Whitelist only required domains and revoke excess API permissions.`,
      impact: Math.min(15, domainV.blockedCount * 3 + domainV.flaggedCount),
      icon: "shield",
    });
  }
  if (dataV && (dataV.blockedCount + dataV.flaggedCount) > 0) {
    recs.push({
      priority: recs.length + 1,
      action: "Enable stricter data masking",
      detail: `${dataV.blockedCount + dataV.flaggedCount} PII exposure events. Tighten masking patterns to cover email, phone, and SSN fields.`,
      impact: Math.min(12, (dataV.blockedCount + dataV.flaggedCount) * 2),
      icon: "eye",
    });
  }
  if (costV && (costV.blockedCount + costV.flaggedCount) > 0) {
    recs.push({
      priority: recs.length + 1,
      action: "Lower LLM spending threshold",
      detail: `${costV.blockedCount + costV.flaggedCount} cost violations. Reduce per-request token budget by 30% and set hard daily limits.`,
      impact: Math.min(8, costV.flaggedCount * 1.5 + costV.blockedCount * 3),
      icon: "dollar",
    });
  }
  if (profile.trustScore < 60) {
    recs.push({
      priority: recs.length + 1,
      action: "Require human-in-the-loop oversight",
      detail: "Trust score below safe threshold. Flag all high-risk actions for human review before execution.",
      impact: 6,
      icon: "user",
    });
  }
  if (recs.length === 0) {
    recs.push({
      priority: 1,
      action: "Schedule preventive compliance audit",
      detail: "No active violations. Run a preventive audit to maintain current governance posture.",
      impact: 5,
      icon: "check",
    });
  }
  return recs.slice(0, 4);
}

function computeRecommendedAction(profile: AgentProfile, level: TrustLevel): string {
  if (level === "CRITICAL")  return "Immediately suspend agent execution and escalate to security team.";
  if (level === "HIGH RISK") {
    const domainV = profile.violations.find((v) => v.ruleType === "domain_block");
    if (domainV && domainV.blockedCount > 0)
      return "Review external API permissions immediately. Restrict domain access policy before next scheduled execution.";
    const dataV = profile.violations.find((v) => v.ruleType === "data_masking");
    if (dataV) return "Enforce stricter data masking on all agent outputs. Audit recent data access logs.";
    return "Review agent configuration and apply stricter policy boundaries within 24 hours.";
  }
  if (level === "WATCHLIST") return "Monitor closely. Review flagged actions and tighten policies if violation rate increases.";
  return "No immediate action required. Continue routine monitoring.";
}

// ── SVG Radar chart ───────────────────────────────────────────────────────────

const RADAR_LABELS = ["Compliance", "Cost Control", "Data Safety", "Tool Safety", "Reliability", "Autonomy"];
const NUM_AXES = 6;
const CX = 160, CY = 148, MAX_R = 100;

function radarPt(axisIdx: number, value: number) {
  const a = ((-90 + axisIdx * 60) * Math.PI) / 180;
  const r = (value / 100) * MAX_R;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function hexPath(fraction: number): string {
  return (
    Array.from({ length: NUM_AXES }, (_, i) => {
      const p = radarPt(i, fraction * 100);
      return `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    }).join(" ") + " Z"
  );
}

function RadarChart({ fp }: { fp: BehaviorFingerprint }) {
  const vals = [fp.compliance, fp.costControl, fp.dataAccessSafety, fp.toolUsageSafety, fp.reliability, fp.autonomyRisk];
  const polyPath =
    vals.map((v, i) => {
      const p = radarPt(i, v);
      return `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    }).join(" ") + " Z";

  return (
    <svg viewBox="0 0 320 296" className="w-full max-w-xs" aria-hidden="true">
      <defs>
        <radialGradient id="rfill" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#06b6d4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.04" />
        </radialGradient>
      </defs>

      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <path key={f} d={hexPath(f)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      ))}

      {/* Axis lines */}
      {Array.from({ length: NUM_AXES }, (_, i) => {
        const end = radarPt(i, 100);
        return (
          <line key={i} x1={CX} y1={CY} x2={end.x.toFixed(2)} y2={end.y.toFixed(2)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        );
      })}

      {/* Data polygon */}
      <path
        d={polyPath}
        fill="url(#rfill)"
        stroke="#06b6d4"
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 8px rgba(6,182,212,0.55))" }}
      />

      {/* Dots */}
      {vals.map((v, i) => {
        const p = radarPt(i, v);
        return (
          <g key={i}>
            <circle cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r="4.5" fill="#06b6d4" opacity="0.9" />
            <circle cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r="2"   fill="white" />
          </g>
        );
      })}

      {/* Labels */}
      {RADAR_LABELS.map((label, i) => {
        const a = ((-90 + i * 60) * Math.PI) / 180;
        const LABEL_R = MAX_R + 22;
        const lx = CX + LABEL_R * Math.cos(a);
        const ly = CY + LABEL_R * Math.sin(a);
        const anchor = Math.abs(Math.cos(a)) < 0.15 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
        return (
          <text key={i} x={lx.toFixed(2)} y={ly.toFixed(2)} textAnchor={anchor} dominantBaseline="central" fontSize="9.5" fill="rgba(148,163,184,0.75)" fontFamily="system-ui, sans-serif">
            {label}
          </text>
        );
      })}

      {/* Ring labels */}
      {[25, 50, 75].map((v) => (
        <text key={v} x={CX + 3} y={(CY - (v / 100) * MAX_R).toFixed(2)} fontSize="7.5" fill="rgba(255,255,255,0.18)" fontFamily="monospace">
          {v}
        </text>
      ))}
    </svg>
  );
}

// ── Mock data ─────────────────────────────────────────────────────────────────

function buildMock(agentId: string): AgentProfile {
  const today = new Date();
  const arc = [92, 90, 87, 83, 79, 76, 74, 72, 70, 68, 67, 66, 66, 66];
  const trendData = arc.map((score, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (arc.length - 1 - i));
    const blocked = i < 8 ? Math.floor(i / 3) + 1 : 0;
    const flagged = i < 10 ? 1 : 0;
    const allowed = 5;
    return {
      date: d.toISOString().slice(0, 10),
      total: blocked + flagged + allowed,
      blocked,
      flagged,
      allowed,
      trustScore: score,
    };
  });

  return {
    agentId,
    agentName: "DataSync Pro v2.1",
    agentFramework: "LangChain",
    trustScore: 66,
    complianceScore: 72,
    violationRate: 0.28,
    riskTrend: "degrading",
    totalActions: 89,
    blockedCount: 8,
    flaggedCount: 11,
    allowedCount: 70,
    recentTrend: arc.slice(-7),
    trendData,
    violations: [
      { ruleType: "domain_block", policyName: "Domain Block",       blockedCount: 4, flaggedCount: 2, lastOccurredAt: new Date(Date.now() - 15 * 3600000).toISOString() },
      { ruleType: "data_masking", policyName: "PII / Data Masking", blockedCount: 3, flaggedCount: 4, lastOccurredAt: new Date(Date.now() - 38 * 3600000).toISOString() },
      { ruleType: "cost_limit",   policyName: "LLM Cost Limit",     blockedCount: 1, flaggedCount: 5, lastOccurredAt: new Date(Date.now() - 71 * 3600000).toISOString() },
    ],
    lastIncidentAt: new Date(Date.now() - 15 * 3600000).toISOString(),
    lastIncidentActionType: "export_customer_records",
  };
}

// ── Section 1 — Executive Risk Banner ────────────────────────────────────────

function S1_ExecutiveBanner({ profile, level, prediction, isDemo }: {
  profile: AgentProfile;
  level: TrustLevel;
  prediction: Prediction;
  isDemo: boolean;
}) {
  const cfg = TRUST_LEVEL_CONFIG[level];
  const LevelIcon = cfg.Icon;
  const TrendIcon = profile.riskTrend === "improving" ? TrendingUp : profile.riskTrend === "degrading" ? TrendingDown : Minus;
  const trendColor = profile.riskTrend === "improving" ? "#22c55e" : profile.riskTrend === "degrading" ? "#ef4444" : "#64748b";
  const recommendedAction = computeRecommendedAction(profile, level);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-6"
      style={{
        background: `linear-gradient(135deg, ${cfg.bg} 0%, #0a0e1a 100%)`,
        borderColor: cfg.border,
        boxShadow: `0 0 40px ${cfg.glow}`,
      }}
    >
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: cfg.color, boxShadow: `0 0 16px ${cfg.glow}` }} />

      {/* Top row */}
      <div className="flex flex-wrap items-start justify-between gap-4 pl-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">AI AGENT</span>
            {isDemo && (
              <Badge variant="outline" className="border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] text-[10px]">Demo</Badge>
            )}
          </div>
          <h2 className="mt-0.5 text-xl font-black uppercase tracking-wide text-foreground">{profile.agentName}</h2>
          {profile.agentFramework && (
            <p className="mt-0.5 text-[11px] text-muted-foreground/50">{profile.agentFramework} Framework</p>
          )}
        </div>

        <div
          className="flex items-center gap-2.5 rounded-xl px-4 py-2.5"
          style={{ background: `${cfg.color}18`, border: `1.5px solid ${cfg.color}44` }}
        >
          <LevelIcon className="h-5 w-5 shrink-0" style={{ color: cfg.color, filter: `drop-shadow(0 0 4px ${cfg.color})` }} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Trust Level</p>
            <p className="text-sm font-black" style={{ color: cfg.color }}>{level}</p>
          </div>
        </div>
      </div>

      {/* Metric strip */}
      <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/5 pl-4">
        {[
          { label: "Trust Score",   value: `${profile.trustScore}`, sub: "/ 100", color: cfg.color,   icon: null },
          { label: "Risk Trend",    value: trendLabel(profile.riskTrend), sub: null, color: trendColor, icon: <TrendIcon className="mb-0.5 inline h-3.5 w-3.5" style={{ color: trendColor }} /> },
          { label: "Last Incident", value: profile.lastIncidentAt ? relativeTime(profile.lastIncidentAt) : "None", sub: null, color: profile.lastIncidentAt ? "#ef4444" : "#22c55e", icon: <Clock className="mb-0.5 inline h-3 w-3 text-muted-foreground/40" /> },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} className="bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">{label}</p>
            <p className="mt-1 text-2xl font-black leading-none" style={{ color }}>
              {icon} {value}
              {sub && <span className="ml-1 text-sm font-normal text-muted-foreground/40">{sub}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Recommended action */}
      <div
        className="mt-5 ml-4 flex items-start gap-3 rounded-xl p-3.5"
        style={{ background: `${cfg.color}0e`, border: `1px solid ${cfg.color}22` }}
      >
        <LevelIcon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: cfg.color }} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>Recommended Action</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{recommendedAction}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-4 ml-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground/40">
        <span>{profile.totalActions} total actions</span>
        <span>·</span>
        <span className="text-[#ef4444]/60">{profile.blockedCount} blocked</span>
        <span>·</span>
        <span className="text-[#f59e0b]/60">{profile.flaggedCount} flagged</span>
        <span>·</span>
        <span>Compliance {profile.complianceScore}%</span>
        <span>·</span>
        <span>Projected <span className="font-semibold text-muted-foreground/60">{prediction.projected}</span> in 7d</span>
      </div>
    </div>
  );
}

// ── Section 2 — Why Trust Changed ────────────────────────────────────────────

function S2_WhyTrustChanged({ profile }: { profile: AgentProfile }) {
  const previousScore = profile.recentTrend[0] ?? profile.trustScore;
  const delta = profile.trustScore - previousScore;
  const isDrop = delta < 0;

  const violationWeights = profile.violations.map((v) => v.blockedCount * 10 + v.flaggedCount * 4);
  const totalWeight = violationWeights.reduce((a, b) => a + b, 0);
  const impacts = profile.violations.map((_, i) =>
    totalWeight > 0 ? Math.round((violationWeights[i] / totalWeight) * delta) : 0
  );

  return (
    <div className="space-y-4">
      {/* Score change header */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">7-Day Trust Change</p>
          <p className="mt-1 text-sm text-foreground">
            Trust score <span className="font-bold text-foreground">{isDrop ? "dropped" : "improved"}</span>{" "}
            <span className="font-mono font-bold text-[#06b6d4]">{previousScore}</span>
            <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-muted-foreground/30" />
            <span className="font-mono font-bold" style={{ color: isDrop ? "#ef4444" : "#22c55e" }}>{profile.trustScore}</span>
          </p>
        </div>
        <div
          className="rounded-lg px-3 py-1.5 font-mono text-lg font-black"
          style={{ color: isDrop ? "#ef4444" : "#22c55e", background: isDrop ? "#ef444412" : "#22c55e12" }}
        >
          {delta > 0 ? "+" : ""}{delta}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative space-y-0">
        {profile.violations.map((v, i) => {
          const color = POLICY_COLOR[v.ruleType] ?? "#64748b";
          const PolicyIcon = POLICY_ICON[v.ruleType] ?? Shield;
          const isLast = i === profile.violations.length - 1;
          const weight = violationWeights[i] ?? 0;
          const impactVal = impacts[i] !== undefined && impacts[i] !== 0
            ? impacts[i]
            : -(Math.abs(Math.round((weight / Math.max(totalWeight, 1)) * 20)));

          return (
            <div key={v.ruleType} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2"
                  style={{ background: `${color}18`, borderColor: `${color}55`, boxShadow: `0 0 8px ${color}33` }}
                >
                  <PolicyIcon className="h-3.5 w-3.5" style={{ color }} />
                </div>
                {!isLast && <div className="mt-0 w-px flex-1 bg-border" />}
              </div>

              <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-3"}`}>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{v.policyName}</span>
                        <Badge
                          variant="outline"
                          className="border-border px-1.5 py-0 text-[9px]"
                          style={{ color, borderColor: `${color}40` }}
                        >
                          {v.blockedCount > 0 ? `${v.blockedCount} Blocked` : `${v.flaggedCount} Flagged`}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {v.blockedCount} blocked · {v.flaggedCount} flagged
                        {v.lastOccurredAt ? ` · Last: ${relativeTime(v.lastOccurredAt)}` : ""}
                      </p>
                    </div>
                    <div
                      className="shrink-0 rounded-lg px-2.5 py-1 font-mono text-sm font-bold"
                      style={{ color: "#ef4444", background: "#ef444412" }}
                    >
                      {impactVal}
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${totalWeight > 0 ? (weight / totalWeight) * 100 : 0}%`,
                        background: color,
                        boxShadow: `0 0 4px ${color}66`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground/40">
                    {totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0}% of total violation weight
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {profile.violations.length === 0 && (
          <div className="rounded-xl border border-border bg-card px-5 py-6 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-[#22c55e]/60" />
            <p className="text-sm text-muted-foreground">No policy violations on record.</p>
          </div>
        )}
      </div>

      {/* Contribution breakdown table */}
      {profile.violations.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Contribution Breakdown</p>
          <div className="space-y-2">
            {profile.violations.map((v, i) => {
              const weight = violationWeights[i] ?? 0;
              const impactVal = impacts[i] !== undefined && impacts[i] !== 0
                ? impacts[i]
                : -(Math.abs(Math.round((weight / Math.max(totalWeight, 1)) * 20)));
              return (
                <div key={v.ruleType} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{v.policyName}</span>
                  <span className="font-mono font-bold text-[#ef4444]">{impactVal}</span>
                </div>
              );
            })}
            <div className="my-1 h-px bg-border" />
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-foreground">Total Change</span>
              <span className="font-mono" style={{ color: isDrop ? "#ef4444" : "#22c55e" }}>
                {delta > 0 ? "+" : ""}{delta}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section 3 — AI Behavior Fingerprint ──────────────────────────────────────

function S3_Fingerprint({ fp }: { fp: BehaviorFingerprint }) {
  const dims: { key: keyof BehaviorFingerprint; label: string }[] = [
    { key: "compliance",       label: "Compliance" },
    { key: "costControl",      label: "Cost Control" },
    { key: "dataAccessSafety", label: "Data Safety" },
    { key: "toolUsageSafety",  label: "Tool Safety" },
    { key: "reliability",      label: "Reliability" },
    { key: "autonomyRisk",     label: "Autonomy" },
  ];

  function dimColor(v: number) {
    if (v >= 75) return "#22c55e";
    if (v >= 50) return "#f59e0b";
    return "#ef4444";
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#06b6d4]">AI Behavior Fingerprint</span>
      <p className="mb-5 mt-1 text-xs text-muted-foreground/50">Unique behavioral signature derived from action history</p>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="flex w-full justify-center sm:w-auto">
          <RadarChart fp={fp} />
        </div>

        <div className="w-full space-y-3 sm:flex-1">
          {dims.map(({ key, label }) => {
            const v = fp[key];
            const color = dimColor(v);
            return (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    {v < 50 && <AlertTriangle className="h-3 w-3 text-[#f59e0b]" />}
                  </div>
                  <span className="font-mono text-xs font-bold" style={{ color }}>{v}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v}%`, background: color, boxShadow: `0 0 4px ${color}55` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Section 4 — Trust Prediction ─────────────────────────────────────────────

function S4_TrustPrediction({ prediction, currentScore, trendData }: {
  prediction: Prediction;
  currentScore: number;
  trendData: AgentProfile["trendData"];
}) {
  const delta = prediction.projected - currentScore;
  const projColor = prediction.projected >= 80 ? "#22c55e" : prediction.projected >= 60 ? "#f59e0b" : "#ef4444";

  const recentScores = trendData.slice(-7).map((d) => d.trustScore);
  const W = 240, H = 60;
  const halfW = W * 0.5;
  const pts = recentScores.map((s, i) => ({
    x: (i / Math.max(recentScores.length - 1, 1)) * halfW,
    y: H - (s / 100) * H,
  }));
  const lastPt = pts[pts.length - 1] ?? { x: halfW, y: H * 0.5 };
  const projPt = { x: W, y: H - (prediction.projected / 100) * H };
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const basis = prediction.trendSlope < -0.5
    ? `Violation frequency is increasing. If current pattern continues, trust score will fall below ${Math.min(prediction.projected + 10, currentScore)} within 5 days.`
    : prediction.trendSlope > 0.5
    ? "Recent actions show improved policy compliance. Trust recovery is underway."
    : "Violation frequency is holding steady. Score trajectory depends on upcoming agent behavior.";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5"
      style={{ background: "linear-gradient(135deg, #0f0a1e 0%, #0a0e1a 100%)", borderColor: "#a855f720" }}
    >
      <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[#a855f7] opacity-5 blur-3xl" />

      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#a855f7]">AI Trust Forecast</span>
        <span className="rounded-full border border-[#a855f7]/20 bg-[#a855f7]/10 px-2 py-0.5 text-[9px] font-bold text-[#a855f7]">ML POWERED</span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground/50">Projected Trust Score (7 days)</p>

      <div className="flex items-end gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Current</p>
          <p className="mt-0.5 font-mono text-4xl font-black text-foreground">{currentScore}</p>
        </div>
        <div className="mb-2 text-muted-foreground/30">→</div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Likely Outcome</p>
          <p className="mt-0.5 font-mono text-4xl font-black" style={{ color: projColor }}>{prediction.projected}</p>
          <p className="text-[11px] font-bold" style={{ color: delta < 0 ? "#ef4444" : "#22c55e" }}>
            {delta > 0 ? "+" : ""}{delta} pts
          </p>
        </div>
      </div>

      <div className="my-4 overflow-hidden rounded-lg bg-white/[0.03] p-2">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <path d={pathD} stroke="#06b6d4" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <line x1={lastPt.x.toFixed(1)} y1={lastPt.y.toFixed(1)} x2={projPt.x.toFixed(1)} y2={projPt.y.toFixed(1)} stroke={projColor} strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1={halfW.toFixed(1)} y1="0" x2={halfW.toFixed(1)} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="2 2" />
          <text x={(halfW + 4).toFixed(1)} y="10" fontSize="7" fill="rgba(148,163,184,0.4)" fontFamily="monospace">Today</text>
          <circle cx={projPt.x} cy={projPt.y} r="4" fill={projColor} opacity="0.8" />
        </svg>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="text-muted-foreground/60">Prediction Confidence</span>
            <span className="font-mono font-bold text-[#a855f7]">{prediction.confidence}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-[#a855f7]" style={{ width: `${prediction.confidence}%`, boxShadow: "0 0 6px #a855f755" }} />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="text-muted-foreground/60">Probability of Critical Incident</span>
            <span className="font-mono font-bold" style={{ color: prediction.criticalProbability > 30 ? "#ef4444" : "#f59e0b" }}>
              {prediction.criticalProbability}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full"
              style={{
                width: `${prediction.criticalProbability}%`,
                background: prediction.criticalProbability > 30 ? "#ef4444" : "#f59e0b",
              }}
            />
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground/50">{basis}</p>
    </div>
  );
}

// ── Section 5 — Recommended Actions ──────────────────────────────────────────

function S5_RecommendedActions({ recs, currentScore }: { recs: Recommendation[]; currentScore: number }) {
  const totalRecovery = recs.reduce((s, r) => s + r.impact, 0);
  const projectedMax = Math.min(100, currentScore + totalRecovery);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3.5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Remediation Playbook</p>
          <p className="mt-0.5 text-sm text-foreground">
            Implementing all actions could raise trust score to <span className="font-bold text-[#22c55e]">{projectedMax}/100</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground/40">Total Possible Recovery</p>
          <p className="font-mono text-xl font-black text-[#22c55e]">+{totalRecovery} pts</p>
        </div>
      </div>

      {recs.map((rec) => {
        const Icon = REC_ICON_MAP[rec.icon];
        const priorityColor = rec.priority === 1 ? "#ef4444" : rec.priority === 2 ? "#f59e0b" : "#06b6d4";

        return (
          <div key={rec.priority} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-colors hover:border-white/10">
            <div className="absolute left-0 top-0 h-full w-[3px]" style={{ background: priorityColor }} />

            <div className="ml-3 flex items-start gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                  style={{ background: `${priorityColor}15`, border: `1px solid ${priorityColor}30` }}
                >
                  <Icon className="h-4 w-4" style={{ color: priorityColor }} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: priorityColor }}>P{rec.priority}</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{rec.action}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground/60">{rec.detail}</p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[10px] text-muted-foreground/40">Est. Impact</p>
                <p className="font-mono text-lg font-black text-[#22c55e]">+{Math.round(rec.impact)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AgentTrustProfilePage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { selectedTenantId, loading: tenantsLoading } = useTenants();
  const router = useRouter();

  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (tenantsLoading) return;

    if (!selectedTenantId) {
      setProfile(buildMock(agentId));
      setIsDemo(true);
      setLoading(false);
      return;
    }

    const tenantId = selectedTenantId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/agents/${agentId}/profile`, {
          headers: { "x-tenant-id": tenantId },
        });
        if (res.ok) {
          const data = (await res.json()) as AgentProfile;
          if (!cancelled) { setProfile(data); setIsDemo(false); }
        } else {
          if (!cancelled) { setProfile(buildMock(agentId)); setIsDemo(true); }
        }
      } catch {
        if (!cancelled) { setProfile(buildMock(agentId)); setIsDemo(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [agentId, selectedTenantId, tenantsLoading]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48 bg-muted" />
        <Skeleton className="h-52 rounded-2xl bg-muted" />
        <Skeleton className="h-64 rounded-2xl bg-muted" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl bg-muted" />
          <Skeleton className="h-72 rounded-2xl bg-muted" />
        </div>
        <Skeleton className="h-48 rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!profile) return null;

  const level = getTrustLevel(profile.trustScore);
  const prediction = computePrediction(profile);
  const fingerprint = computeFingerprint(profile);
  const recs = computeRecommendations(profile);

  return (
    <div className="space-y-5">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/agents")}
          className="h-8 w-8 border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bot className="h-3.5 w-3.5" />
          <button
            onClick={() => router.push("/dashboard/agents")}
            className="hover:text-foreground transition-colors"
          >
            Agents
          </button>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-foreground">{profile.agentName}</span>
        </div>
      </div>

      {/* Section 1 — Executive Risk Banner */}
      <S1_ExecutiveBanner profile={profile} level={level} prediction={prediction} isDemo={isDemo} />

      {/* Section 2 — Why Trust Changed */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Why Trust Changed</p>
        <S2_WhyTrustChanged profile={profile} />
      </div>

      {/* Section 3 + 4 — Fingerprint & Prediction */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">AI Behavior Fingerprint</p>
          <S3_Fingerprint fp={fingerprint} />
        </div>
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Trust Prediction</p>
          <S4_TrustPrediction prediction={prediction} currentScore={profile.trustScore} trendData={profile.trendData} />
        </div>
      </div>

      {/* Section 5 — Recommended Actions */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Recommended Actions</p>
        <S5_RecommendedActions recs={recs} currentScore={profile.trustScore} />
      </div>
    </div>
  );
}
