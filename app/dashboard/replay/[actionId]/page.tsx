"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock,
  Database,
  MessageSquare,
  Shield,
  ShieldAlert,
  Terminal,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import type { ReplayTimeline, StepPhase, StepStatus } from "@/app/api/actions/[id]/replay/route";

// ─── Mock fallback (demo / 404) ───────────────────────────────────────────────

const MOCK_TIMELINE: ReplayTimeline = {
  actionId: "demo",
  agentName: "DataSync Pro v2.1",
  agentFramework: "LangChain",
  actionType: "export_customer_records",
  finalResult: "blocked",
  finalRiskScore: 94,
  totalDurationMs: 523,
  recordedAt: "2026-06-16T14:23:11.727Z",
  steps: [
    {
      step: 1,
      phase: "request",
      title: "User Request Received",
      description:
        "Export Q2 churn-risk cohort to Salesforce Marketing Cloud for re-engagement campaign. Include full contact details and usage metrics.",
      timestamp: "2026-06-16T14:23:11.204Z",
      durationMs: 0,
      status: "completed",
      metadata: [
        { key: "Agent", value: "DataSync Pro v2.1" },
        { key: "Action Type", value: "export customer records" },
        { key: "Est. Cost", value: "$0.002340" },
      ],
    },
    {
      step: 2,
      phase: "reasoning",
      title: "Agent Reasoning & Planning",
      description:
        "DataSync Pro v2.1 parsed the export request and determined an export_customer_records operation was required. Target systems identified: Database, CRM. Assembled 3-step execution pipeline.",
      timestamp: "2026-06-16T14:23:11.275Z",
      durationMs: 71,
      status: "completed",
      metadata: [
        { key: "Agent", value: "DataSync Pro v2.1" },
        { key: "Framework", value: "LangChain" },
        { key: "Planned Operation", value: "export customer records" },
        { key: "Target Systems", value: "Database, CRM" },
      ],
    },
    {
      step: 3,
      phase: "tools",
      title: "Tool Invocation: export_customer_records",
      description:
        "Agent invoked the export_customer_records tool with a churn_risk > 0.8 filter. Record retrieval and packaging pipeline initiated against the primary customer database.",
      timestamp: "2026-06-16T14:23:11.409Z",
      durationMs: 134,
      status: "completed",
      metadata: [
        { key: "Tool", value: "export_customer_records" },
        { key: "Filter", value: "churn_risk > 0.8" },
        { key: "Destination", value: "salesforce-api" },
        { key: "Record Estimate", value: "~4,247" },
      ],
    },
    {
      step: 4,
      phase: "data",
      title: "Data Access & Output Capture",
      description:
        "Tool execution completed. Retrieved 4,247 customer records. PII fields detected in payload: email (4,247 records), phone (3,891 records), SSN (1,204 records). Payload staged for external transmission.",
      timestamp: "2026-06-16T14:23:11.598Z",
      durationMs: 189,
      status: "warning",
      metadata: [
        { key: "Records Retrieved", value: "4,247" },
        { key: "PII Fields Detected", value: "email, phone, ssn" },
        { key: "Data Sensitivity", value: "HIGH" },
        { key: "Destination Endpoint", value: "salesforce-api.company.com" },
      ],
    },
    {
      step: 5,
      phase: "policy_eval",
      title: "Policy Evaluation: PII / Data Masking",
      description:
        "The data masking policy was evaluated against the export payload. Three regulated PII field types (email, phone, SSN) detected. Transmission to the external Salesforce endpoint without masking would violate active governance policy.",
      timestamp: "2026-06-16T14:23:11.685Z",
      durationMs: 87,
      status: "warning",
      metadata: [
        { key: "Policy", value: "PII / Data Masking" },
        { key: "PII Types Found", value: "email, phone, ssn" },
        { key: "Risk Level", value: "CRITICAL (94/100)" },
        { key: "Permitted PII Fields", value: "0" },
      ],
    },
    {
      step: 6,
      phase: "decision",
      title: "Policy Decision: BLOCKED",
      description:
        "This export customer records action by DataSync Pro v2.1 was blocked due to PII / Data Masking policy evaluation, creating critical risk exposure to Database and CRM systems. Real-time blocking prevented potential data leakage before transmission.",
      timestamp: "2026-06-16T14:23:11.719Z",
      durationMs: 34,
      status: "blocked",
      riskScore: 94,
      metadata: [
        { key: "Verdict", value: "BLOCKED" },
        { key: "Policy Matched", value: "PII / Data Masking" },
        { key: "Risk Score", value: "94 / 100" },
        { key: "Risk Level", value: "CRITICAL" },
      ],
    },
    {
      step: 7,
      phase: "outcome",
      title: "Final Outcome: BLOCKED",
      description:
        "Action halted before data reached external endpoint. 4,247 customer records protected from unauthorized transmission to Salesforce Marketing Cloud. Incident has been recorded for compliance audit and security review queue.",
      timestamp: "2026-06-16T14:23:11.727Z",
      durationMs: 8,
      status: "blocked",
      riskScore: 94,
      metadata: [
        { key: "Final Result", value: "BLOCKED" },
        { key: "Risk Score", value: "94 / 100" },
        { key: "Records Protected", value: "4,247" },
        { key: "Total Cost", value: "$0.002340" },
        { key: "Audit Record", value: "Created" },
      ],
    },
  ],
};

// ─── Config maps ──────────────────────────────────────────────────────────────

const PHASE_CONFIG: Record<StepPhase, { label: string; color: string }> = {
  request:    { label: "Request",     color: "#06b6d4" },
  reasoning:  { label: "Reasoning",  color: "#a855f7" },
  tools:      { label: "Tools",       color: "#8b5cf6" },
  data:       { label: "Data Access", color: "#f59e0b" },
  policy_eval:{ label: "Policy Eval", color: "#f59e0b" },
  decision:   { label: "Decision",    color: "#ef4444" },
  outcome:    { label: "Outcome",     color: "#ef4444" },
};

function phaseIcon(phase: StepPhase) {
  switch (phase) {
    case "request":     return MessageSquare;
    case "reasoning":   return Brain;
    case "tools":       return Terminal;
    case "data":        return Database;
    case "policy_eval": return Shield;
    case "decision":    return ShieldAlert;
    case "outcome":     return Zap;
  }
}

function statusColor(status: StepStatus) {
  switch (status) {
    case "blocked":   return "#ef4444";
    case "flagged":   return "#f59e0b";
    case "warning":   return "#f59e0b";
    case "allowed":   return "#22c55e";
    default:          return "#475569";
  }
}

function statusIcon(status: StepStatus) {
  switch (status) {
    case "blocked": return XCircle;
    case "flagged": return AlertTriangle;
    case "warning": return AlertTriangle;
    case "allowed": return CheckCircle2;
    default:        return CheckCircle2;
  }
}

function statusLabel(status: StepStatus) {
  switch (status) {
    case "blocked":   return "BLOCKED";
    case "flagged":   return "FLAGGED";
    case "warning":   return "WARNING";
    case "allowed":   return "ALLOWED";
    default:          return "OK";
  }
}

function formatTs(iso: string): string {
  const d = new Date(iso);
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  const ss = d.getUTCSeconds().toString().padStart(2, "0");
  const ms = d.getUTCMilliseconds().toString().padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms} UTC`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "UTC", timeZoneName: "short",
  });
}

// ─── Verdict config ───────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  blocked: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.07)",
    border: "rgba(239,68,68,0.22)",
    glow: "rgba(239,68,68,0.18)",
    icon: XCircle,
    label: "BLOCKED",
  },
  flagged: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.07)",
    border: "rgba(245,158,11,0.22)",
    glow: "rgba(245,158,11,0.18)",
    icon: AlertTriangle,
    label: "FLAGGED",
  },
  allowed: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.07)",
    border: "rgba(34,197,94,0.22)",
    glow: "rgba(34,197,94,0.18)",
    icon: CheckCircle2,
    label: "ALLOWED",
  },
};

// ─── Timeline step card ───────────────────────────────────────────────────────

function StepCard({
  step,
  isLast,
}: {
  step: ReplayTimeline["steps"][number];
  isLast: boolean;
}) {
  const PhaseIcon = phaseIcon(step.phase);
  const StatusIcon = statusIcon(step.status);
  const phaseColor = PHASE_CONFIG[step.phase].color;
  const dotColor = statusColor(step.status);
  const isHighlighted = step.status === "blocked" || step.status === "flagged";

  return (
    <div className="relative flex gap-4">
      {/* Left: dot + connector line */}
      <div className="relative flex flex-col items-center">
        <div
          className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2"
          style={{
            borderColor: dotColor,
            background: `${dotColor}18`,
            boxShadow: isHighlighted ? `0 0 14px ${dotColor}55` : "none",
          }}
        >
          <span className="text-[10px] font-bold" style={{ color: dotColor }}>
            {step.step}
          </span>
        </div>
        {!isLast && (
          <div
            className="absolute top-9 h-full w-px"
            style={{ background: "rgba(255,255,255,0.06)", left: "50%", transform: "translateX(-50%)" }}
          />
        )}
      </div>

      {/* Right: card */}
      <div className={cn("mb-5 flex-1", isLast && "mb-0")}>
        <div
          className="rounded-xl border p-4 transition-all duration-200"
          style={{
            background: isHighlighted ? `${dotColor}06` : "rgba(15,23,42,0.4)",
            borderColor: isHighlighted ? `${dotColor}28` : "rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* Card header row */}
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {/* Phase icon */}
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                style={{ background: `${phaseColor}18`, border: `1px solid ${phaseColor}33` }}
              >
                <PhaseIcon className="h-3.5 w-3.5" style={{ color: phaseColor }} />
              </div>

              <div>
                {/* Phase label */}
                <p
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: phaseColor }}
                >
                  {PHASE_CONFIG[step.phase].label}
                </p>
                {/* Step title */}
                <p className="text-sm font-semibold leading-tight text-foreground">
                  {step.title}
                </p>
              </div>
            </div>

            {/* Status badge */}
            {step.status !== "completed" && (
              <div
                className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5"
                style={{
                  background: `${dotColor}14`,
                  border: `1px solid ${dotColor}33`,
                }}
              >
                <StatusIcon className="h-3 w-3" style={{ color: dotColor }} />
                <span className="text-[10px] font-bold" style={{ color: dotColor }}>
                  {statusLabel(step.status)}
                </span>
              </div>
            )}
          </div>

          {/* Timestamp + duration row */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span
              className="font-mono text-[11px] text-muted-foreground/60"
              style={{ letterSpacing: "0.03em" }}
            >
              ⏱ {formatTs(step.timestamp)}
            </span>
            {step.durationMs > 0 && (
              <span
                className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/50"
              >
                +{step.durationMs}ms
              </span>
            )}
            {step.riskScore !== undefined && (
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: `${dotColor}14`,
                  border: `1px solid ${dotColor}28`,
                  color: dotColor,
                }}
              >
                Risk {step.riskScore}/100
              </span>
            )}
          </div>

          {/* Description */}
          <p className="mb-3 text-sm leading-relaxed text-foreground/70">
            {step.description}
          </p>

          {/* Metadata grid */}
          {step.metadata && step.metadata.length > 0 && (
            <dl
              className="grid gap-x-6 gap-y-1 rounded-lg border border-border/60 bg-black/20 px-3 py-2.5"
              style={{ gridTemplateColumns: "auto 1fr" }}
            >
              {step.metadata.map(({ key, value }) => (
                <>
                  <dt
                    key={`k-${key}`}
                    className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 whitespace-nowrap"
                  >
                    {key}
                  </dt>
                  <dd
                    key={`v-${key}`}
                    className="truncate font-mono text-[11px] text-foreground/70"
                  >
                    {value}
                  </dd>
                </>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReplayPage() {
  const { actionId } = useParams<{ actionId: string }>();
  const { selectedTenantId, loading: tenantsLoading } = useTenants();
  const router = useRouter();

  const [timeline, setTimeline] = useState<ReplayTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (tenantsLoading) return;
    if (!selectedTenantId) {
      setTimeline(MOCK_TIMELINE);
      setIsDemo(true);
      setLoading(false);
      return;
    }

    const tenantId = selectedTenantId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/actions/${actionId}/replay`, {
          headers: { "x-tenant-id": tenantId },
        });
        if (res.ok) {
          const data = (await res.json()) as ReplayTimeline;
          if (!cancelled) { setTimeline(data); setIsDemo(false); }
        } else {
          if (!cancelled) { setTimeline(MOCK_TIMELINE); setIsDemo(true); }
        }
      } catch {
        if (!cancelled) { setTimeline(MOCK_TIMELINE); setIsDemo(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [actionId, selectedTenantId, tenantsLoading]);

  const verdict = timeline
    ? (VERDICT_CONFIG[timeline.finalResult as keyof typeof VERDICT_CONFIG] ??
       VERDICT_CONFIG.allowed)
    : VERDICT_CONFIG.blocked;

  const VerdictIcon = verdict.icon;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-muted" />
        <Skeleton className="h-40 rounded-xl bg-muted" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full bg-muted" />
              <Skeleton className="h-28 flex-1 rounded-xl bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!timeline) return null;

  return (
    <div className="space-y-6">

      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8 border border-border text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-foreground">AI Flight Recorder</h1>
            <Badge
              variant="outline"
              className="border-[#a855f7]/30 bg-[#a855f7]/10 text-[#a855f7]"
            >
              Black Box Replay
            </Badge>
            {isDemo && (
              <Badge
                variant="outline"
                className="border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b]"
              >
                Demo Incident
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Full execution reconstruction — every step, timestamp, and policy decision recorded.
          </p>
        </div>
      </div>

      {/* ── Verdict header card ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-xl border p-6"
        style={{
          background: verdict.bg,
          borderColor: verdict.border,
          boxShadow: `0 0 40px ${verdict.glow}, 0 4px 16px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Background glow blob */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full opacity-20"
          style={{
            background: verdict.color,
            filter: "blur(60px)",
            transform: "translate(30%, -30%)",
          }}
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Verdict icon */}
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2"
              style={{
                borderColor: verdict.border,
                background: `${verdict.color}18`,
                boxShadow: `0 0 20px ${verdict.color}33`,
              }}
            >
              <VerdictIcon className="h-7 w-7" style={{ color: verdict.color }} />
            </div>

            <div>
              {/* Agent + action */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold text-foreground">
                  {timeline.agentName}
                </span>
                {timeline.agentFramework && (
                  <span className="rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                    {timeline.agentFramework}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                {timeline.actionType.replace(/_/g, " ")}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground/50">
                {formatDate(timeline.recordedAt)}
              </p>
            </div>
          </div>

          {/* Verdict label */}
          <div className="text-right">
            <p
              className="text-4xl font-black tracking-tight"
              style={{ color: verdict.color, textShadow: `0 0 30px ${verdict.color}66` }}
            >
              {verdict.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Policy verdict</p>
          </div>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Duration",
            value: `${timeline.totalDurationMs}ms`,
            icon: Clock,
            color: "#06b6d4",
          },
          {
            label: "Risk Score",
            value: `${timeline.finalRiskScore}/100`,
            icon: ShieldAlert,
            color: verdict.color,
          },
          {
            label: "Steps Recorded",
            value: `${timeline.steps.length}`,
            icon: CheckCircle2,
            color: "#a855f7",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border bg-card">
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${color}15`, border: `1px solid ${color}28` }}
              >
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-foreground">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────────────── */}
      <div>
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Execution Timeline
        </p>

        <div>
          {timeline.steps.map((step, index) => (
            <StepCard
              key={step.step}
              step={step}
              isLast={index === timeline.steps.length - 1}
            />
          ))}
        </div>
      </div>

      {/* ── Footer note ──────────────────────────────────────────────────────── */}
      <p className="text-center text-xs text-muted-foreground/40">
        Flight recorder data is immutable and stored for compliance audit purposes.
        {isDemo && " · Viewing synthetic demo incident."}
      </p>

    </div>
  );
}
