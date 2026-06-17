"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bot,
  DollarSign,
  Pause,
  Play,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatRelativeTime, policyResultBadgeClass } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import type { LiveEvent, LiveKpis } from "@/lib/db/live-stream";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LiveEventsResponse {
  events: LiveEvent[];
  kpis: LiveKpis;
  updatedAt: string;
}

const MAX_EVENTS = 150;

// ── AnimatedCount ─────────────────────────────────────────────────────────────

function AnimatedCount({ value, className }: { value: number; className?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const [animating, setAnimating] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (value !== prev.current) {
      setAnimating(true);
      const t = setTimeout(() => {
        setDisplayed(value);
        setAnimating(false);
        prev.current = value;
      }, 100);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={cn("transition-all duration-300", animating && "scale-95 opacity-60", className)}>
      {displayed.toLocaleString("en-US")}
    </span>
  );
}

// ── KPI strip ─────────────────────────────────────────────────────────────────

function KpiStrip({ kpis, loading }: { kpis: LiveKpis | null; loading: boolean }) {
  const govScore = kpis?.governanceScore ?? 0;
  const items = [
    { label: "Agents Online",   value: kpis?.agentsOnline ?? 0,       icon: Bot,       color: "text-accent",      bg: "bg-accent/10" },
    { label: "Actions / min",   value: kpis?.actionsLastMinute ?? 0,   icon: Zap,       color: "text-chart-1",     bg: "bg-chart-1/10" },
    { label: "Blocked Today",   value: kpis?.blockedToday ?? 0,        icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10" },
    {
      label: "Governance Score",
      value: govScore,
      icon: ShieldCheck,
      color: govScore >= 80 ? "text-success" : govScore >= 50 ? "text-warning" : "text-destructive",
      bg: "bg-secondary",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-accent/50"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                {loading ? (
                  <Skeleton className="mt-2 h-8 w-20 bg-muted" />
                ) : (
                  <p className={cn("mt-2 text-2xl font-bold tracking-tight lg:text-3xl", item.color)}>
                    <AnimatedCount value={item.value} />
                  </p>
                )}
              </div>
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", item.bg)}>
                <Icon className={cn("h-4 w-4", item.color)} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────────

function actionTypeLabel(t: string) { return t.replace(/_/g, " "); }

function policyLabel(r: string | null) {
  if (!r) return null;
  return r.replace(/_/g, " ");
}

function EventRow({
  event,
  isNew,
  onInvestigate,
}: {
  event: LiveEvent;
  isNew: boolean;
  onInvestigate: () => void;
}) {
  const [highlight, setHighlight] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      const t = setTimeout(() => setHighlight(false), 2000);
      return () => clearTimeout(t);
    }
  }, [isNew]);

  const isBlocked = event.policyResult === "blocked";
  const isFlagged = event.policyResult === "flagged";

  return (
    <div
      className={cn(
        "group flex items-start gap-4 rounded-lg border p-3 transition-all duration-500",
        highlight
          ? "border-accent/50 bg-accent/5"
          : isBlocked
            ? "border-destructive/20 bg-destructive/5 hover:border-destructive/40"
            : isFlagged
              ? "border-warning/20 bg-warning/5 hover:border-warning/40"
              : "border-border bg-background hover:border-border/80 hover:bg-secondary/30"
      )}
    >
      <div className="mt-1 shrink-0">
        <span
          className={cn(
            "flex h-2.5 w-2.5 rounded-full",
            isBlocked ? "bg-destructive" : isFlagged ? "bg-warning" : "bg-success"
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-foreground">[{event.agentName}]</span>
          <span className="text-sm text-muted-foreground">{actionTypeLabel(event.actionType)}</span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{event.inputSummary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", policyResultBadgeClass(event.policyResult))}>
            {event.policyResult.toUpperCase()}
          </Badge>
          {policyLabel(event.policyRuleType) && (
            <span className="text-xs text-muted-foreground">Policy: {policyLabel(event.policyRuleType)}</span>
          )}
          {event.costUsd !== null && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              {event.costUsd.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground">{formatRelativeTime(event.createdAt)}</span>
        <button
          onClick={onInvestigate}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Play className="h-2.5 w-2.5" />
          Replay
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LiveStreamPage() {
  const { selectedTenantId, loading: tenantsLoading } = useTenants();
  const router = useRouter();

  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [kpis, setKpis] = useState<LiveKpis | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Simulation: ON by default so the demo is alive on first open
  const [autoSimulate, setAutoSimulate] = useState(true);
  const [simulateError, setSimulateError] = useState<string | null>(null);

  // Track the ISO timestamp of the most recent event we've seen
  const lastTimestampRef = useRef<string | null>(null);
  const isFirstPollRef = useRef(true);
  const seenIdsRef = useRef(new Set<string>());

  // ── Aurora polling ──────────────────────────────────────────────────────────

  useEffect(() => {
    // Reset on tenant change
    lastTimestampRef.current = null;
    isFirstPollRef.current = true;
    seenIdsRef.current = new Set();
    setEvents([]);
    setKpis(null);
    setKpisLoading(true);
    setConnected(false);
    setLastUpdated(null);

    if (!selectedTenantId) return;

    const headers = { "x-tenant-id": selectedTenantId };
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const since = lastTimestampRef.current;
        const url = since
          ? `/api/live-events?since=${encodeURIComponent(since)}`
          : "/api/live-events";

        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as LiveEventsResponse;
        if (cancelled) return;

        if (isFirstPollRef.current) {
          // Initial load — show existing events without highlighting them
          setEvents(data.events);
          data.events.forEach((e) => seenIdsRef.current.add(e.id));
          if (data.events.length > 0) {
            lastTimestampRef.current = data.events[0].createdAt;
          }
          isFirstPollRef.current = false;
          setKpisLoading(false);
        } else if (data.events.length > 0) {
          // Incremental poll — only truly new events arrive here
          const fresh = data.events.filter((e) => !seenIdsRef.current.has(e.id));
          if (fresh.length > 0) {
            const freshIds = new Set(fresh.map((e) => e.id));
            setNewIds(freshIds);
            setEvents((prev) => [...fresh, ...prev].slice(0, MAX_EVENTS));
            fresh.forEach((e) => seenIdsRef.current.add(e.id));
            // Update since to the newest event we received
            lastTimestampRef.current = fresh[0].createdAt;
            setTimeout(() => { if (!cancelled) setNewIds(new Set()); }, 2500);
          }
        }

        setKpis(data.kpis);
        setLastUpdated(data.updatedAt);
        setConnected(true);
        setError(null);
      } catch {
        if (!cancelled) {
          setConnected(false);
          setError("Polling paused. Retrying...");
        }
      }
    }

    poll();
    const interval = setInterval(poll, 3_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedTenantId]);

  // ── Simulate one event ──────────────────────────────────────────────────────

  const runSimulate = useCallback(async () => {
    if (!selectedTenantId) return;
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": selectedTenantId },
        body: JSON.stringify({ count: 1 }),
      });
      if (res.status === 423) {
        setSimulateError("Agents paused via Control Center");
        setAutoSimulate(false);
      } else if (!res.ok) {
        setSimulateError(`Simulate error (${res.status})`);
      } else {
        setSimulateError(null);
      }
    } catch {
      setSimulateError("Simulate unreachable");
    }
  }, [selectedTenantId]);

  // ── Auto-simulation loop (random 5-8 s interval for natural feel) ───────────

  useEffect(() => {
    if (!autoSimulate || !selectedTenantId) return;

    let handle: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      const delay = 5_000 + Math.random() * 3_000; // 5-8 s
      handle = setTimeout(async () => {
        await runSimulate();
        scheduleNext();
      }, delay);
    }

    // Fire once immediately then recurse
    runSimulate();
    scheduleNext();

    return () => clearTimeout(handle);
  }, [autoSimulate, selectedTenantId, runSimulate]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (tenantsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Live Agent Stream</h1>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                connected ? "animate-pulse bg-success" : "bg-muted-foreground"
              )}
            />
            <span className={cn("text-xs font-medium", connected ? "text-success" : "text-muted-foreground")}>
              {connected ? "Connected · Aurora PostgreSQL" : "Connecting..."}
            </span>
          </div>
          <Badge variant="outline" className="border-chart-1/30 bg-chart-1/10 text-chart-1">
            Real-time
          </Badge>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Live AI operations feed — Aurora PostgreSQL, polled every 3 seconds.
          </p>
          {lastUpdated && (
            <span className="font-mono text-xs text-muted-foreground/50">
              Last updated:{" "}
              {new Date(lastUpdated).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}

          {/* Simulation toggle */}
          <button
            onClick={() => setAutoSimulate((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition-colors",
              autoSimulate
                ? "border-success/40 bg-success/10 text-success hover:bg-success/20"
                : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {autoSimulate ? (
              <>
                <Pause className="h-3 w-3" />
                Stop Simulation
              </>
            ) : (
              <>
                <Zap className="h-3 w-3" />
                Start Live Demo
              </>
            )}
          </button>

          {simulateError && <span className="text-xs text-destructive">{simulateError}</span>}
        </div>
      </div>

      {/* KPI strip */}
      <KpiStrip kpis={kpis} loading={kpisLoading} />

      {/* Event feed */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-accent" />
            <CardTitle className="text-base font-semibold text-foreground">Operations Feed</CardTitle>
            {events.length > 0 && (
              <Badge variant="outline" className="border-border text-muted-foreground">
                {events.length} events
              </Badge>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardHeader>

        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              {kpisLoading ? (
                <div className="w-full space-y-3 px-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg bg-muted" />
                  ))}
                </div>
              ) : (
                <>
                  <TrendingDown className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No events yet. The simulator is starting…
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="max-h-[70vh] space-y-2 overflow-y-auto p-4">
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  isNew={newIds.has(event.id)}
                  onInvestigate={() => router.push(`/dashboard/replay/${event.id}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
