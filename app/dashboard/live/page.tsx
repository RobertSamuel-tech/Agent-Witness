"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Bot, DollarSign, ShieldAlert, ShieldCheck, TrendingDown, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatRelativeTime, policyResultBadgeClass } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import type { LiveEvent, LiveKpis } from "@/lib/db/live-stream";

const MAX_EVENTS = 150;

interface AnimatedCountProps {
  value: number;
  className?: string;
}

function AnimatedCount({ value, className }: AnimatedCountProps) {
  const [displayed, setDisplayed] = useState(value);
  const [animating, setAnimating] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (value !== prev.current) {
      setAnimating(true);
      const timeout = setTimeout(() => {
        setDisplayed(value);
        setAnimating(false);
        prev.current = value;
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [value]);

  return (
    <span
      className={cn(
        "transition-all duration-300",
        animating && "opacity-60 scale-95",
        className
      )}
    >
      {displayed.toLocaleString("en-US")}
    </span>
  );
}

function KpiStrip({ kpis, loading }: { kpis: LiveKpis | null; loading: boolean }) {
  const items = [
    {
      label: "Agents Online",
      value: kpis?.agentsOnline ?? 0,
      icon: Bot,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Actions / min",
      value: kpis?.actionsLastMinute ?? 0,
      icon: Zap,
      color: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      label: "Blocked Today",
      value: kpis?.blockedToday ?? 0,
      icon: ShieldAlert,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Governance Score",
      value: kpis?.governanceScore ?? 0,
      icon: ShieldCheck,
      color: kpis
        ? kpis.governanceScore >= 80
          ? "text-success"
          : kpis.governanceScore >= 50
            ? "text-warning"
            : "text-destructive"
        : "text-muted-foreground",
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

function actionTypeLabel(actionType: string): string {
  return actionType.replace(/_/g, " ");
}

function policyLabel(policyRuleType: string | null): string | null {
  if (!policyRuleType) return null;
  return policyRuleType.replace(/_/g, " ");
}

function EventRow({ event, isNew }: { event: LiveEvent; isNew: boolean }) {
  const [highlight, setHighlight] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setHighlight(false), 2000);
      return () => clearTimeout(timer);
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
      {/* Status dot */}
      <div className="mt-1 flex-shrink-0">
        <span
          className={cn(
            "flex h-2.5 w-2.5 rounded-full",
            isBlocked
              ? "bg-destructive"
              : isFlagged
                ? "bg-warning"
                : "bg-success"
          )}
        />
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-foreground">[{event.agentName}]</span>
          <span className="text-sm text-muted-foreground">{actionTypeLabel(event.actionType)}</span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{event.inputSummary}</p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn("text-xs", policyResultBadgeClass(event.policyResult))}
          >
            {event.policyResult.toUpperCase()}
          </Badge>
          {policyLabel(event.policyRuleType) && (
            <span className="text-xs text-muted-foreground">
              Policy: {policyLabel(event.policyRuleType)}
            </span>
          )}
          {event.costUsd !== null && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              {event.costUsd.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex-shrink-0 text-right">
        <span className="text-xs text-muted-foreground">{formatRelativeTime(event.createdAt)}</span>
      </div>
    </div>
  );
}

export default function LiveStreamPage() {
  const { selectedTenantId, loading: tenantsLoading } = useTenants();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [kpis, setKpis] = useState<LiveKpis | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTenantId) return;
    const tenantId = selectedTenantId;
    let cancelled = false;
    let controller: AbortController | null = new AbortController();

    async function streamEvents() {
      setConnected(false);
      setError(null);

      try {
        const response = await fetch("/api/live/stream", {
          headers: { "x-tenant-id": tenantId },
          signal: controller?.signal,
        });

        if (!response.ok || !response.body) {
          if (!cancelled) setError("Failed to connect to live stream");
          return;
        }

        if (!cancelled) setConnected(true);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let eventName = "";
          let dataLine = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventName = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataLine = line.slice(6).trim();
            } else if (line === "" && eventName && dataLine) {
              try {
                const parsed: unknown = JSON.parse(dataLine);

                if (eventName === "init" && Array.isArray(parsed)) {
                  const initEvents = parsed as LiveEvent[];
                  if (!cancelled) {
                    setEvents(initEvents);
                    setKpisLoading(false);
                  }
                } else if (eventName === "events" && Array.isArray(parsed)) {
                  const incoming = parsed as LiveEvent[];
                  if (incoming.length > 0 && !cancelled) {
                    const ids = new Set(incoming.map((e) => e.id));
                    setNewIds(ids);
                    setEvents((prev) => [...incoming, ...prev].slice(0, MAX_EVENTS));
                    setTimeout(() => { if (!cancelled) setNewIds(new Set()); }, 2500);
                  }
                } else if (eventName === "kpis" && !cancelled) {
                  setKpis(parsed as LiveKpis);
                  setKpisLoading(false);
                }
              } catch {
                // ignore malformed SSE data
              }

              eventName = "";
              dataLine = "";
            }
          }
        }
      } catch {
        if (!cancelled) {
          setError("Stream disconnected. Reconnecting...");
          setConnected(false);
          setTimeout(() => {
            if (!cancelled) streamEvents();
          }, 3000);
        }
      }
    }

    streamEvents();

    return () => {
      cancelled = true;
      controller?.abort();
      controller = null;
    };
  }, [selectedTenantId]);

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
              {connected ? "Live" : "Connecting..."}
            </span>
          </div>
          <Badge variant="outline" className="border-chart-1/30 bg-chart-1/10 text-chart-1">
            Real-time
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Live AI operations feed — Aurora PostgreSQL, updated every 3 seconds.
        </p>
      </div>

      {/* KPI Strip */}
      <KpiStrip kpis={kpis} loading={kpisLoading} />

      {/* Event Feed */}
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
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              {kpisLoading ? (
                <div className="space-y-3 w-full px-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg bg-muted" />
                  ))}
                </div>
              ) : (
                <>
                  <TrendingDown className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No agent activity yet. Events appear here in real-time.</p>
                </>
              )}
            </div>
          ) : (
            <div className="max-h-[70vh] space-y-2 overflow-y-auto p-4">
              {events.map((event) => (
                <EventRow key={event.id} event={event} isNew={newIds.has(event.id)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
