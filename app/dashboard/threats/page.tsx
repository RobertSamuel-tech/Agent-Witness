"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  Bot,
  DollarSign,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatRelativeTime, policyResultBadgeClass, truncateMessage } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import type { ThreatIncident, ThreatMetrics, ThreatSeverity } from "@/lib/db/threat-timeline";

const SKELETON_INCIDENT_COUNT = 3;

interface ThreatsResponse {
  metrics: ThreatMetrics;
  incidents: ThreatIncident[];
}

const costFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function severityBadgeClass(severity: ThreatSeverity): string {
  return severity === "CRITICAL"
    ? "border-red-800 bg-red-950/50 text-red-400"
    : "border-yellow-800 bg-yellow-950/50 text-yellow-400";
}

function severityDotClass(severity: ThreatSeverity): string {
  return severity === "CRITICAL" ? "bg-red-500" : "bg-yellow-500";
}

function MetricCard({
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
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", accentClass)} />
      </CardHeader>
      <CardContent>
        <p className={cn("text-3xl font-bold", accentClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function IncidentCard({
  incident,
  index,
  onInvestigate,
}: {
  incident: ThreatIncident;
  index: number;
  onInvestigate: (incident: ThreatIncident) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05 }}
    >
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={severityBadgeClass(incident.severity)}>
                {incident.severity}
              </Badge>
              <span className="text-sm font-semibold text-slate-200">{incident.agentName}</span>
              <Badge variant="outline" className="border-slate-700 text-xs text-slate-300">
                {incident.actionType.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-slate-500">{formatRelativeTime(incident.timestamp)}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInvestigate(incident)}
                className="border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                Investigate
              </Button>
            </div>
          </div>

          <p className="mt-3 line-clamp-2 text-sm text-slate-400">{incident.inputSummary}</p>

          <Separator className="my-4 bg-slate-800" />

          {/* Vertical timeline */}
          <div className="space-y-0">
            {incident.events.map((event, eventIndex) => (
              <motion.div
                key={`${incident.incidentId}-${eventIndex}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index, 8) * 0.05 + eventIndex * 0.08 }}
                className="relative flex gap-3 pb-4 last:pb-0"
              >
                {eventIndex < incident.events.length - 1 ? (
                  <span className="absolute left-[5px] top-3 h-full w-px bg-slate-800" />
                ) : null}
                <span
                  className={cn(
                    "relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                    eventIndex === incident.events.length - 1
                      ? severityDotClass(incident.severity)
                      : "bg-slate-600"
                  )}
                />
                <div className="flex flex-1 items-baseline justify-between gap-2">
                  <span className="text-sm text-slate-300">{event.label}</span>
                  <span className="shrink-0 font-mono text-xs text-slate-500">{formatTime(event.timestamp)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ThreatsPage() {
  const { selectedTenantId, loading: tenantsLoading, error: tenantsError } = useTenants();

  const [data, setData] = useState<ThreatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIncident, setActiveIncident] = useState<ThreatIncident | null>(null);

  useEffect(() => {
    if (!selectedTenantId) return;

    const tenantId = selectedTenantId;
    let cancelled = false;

    async function fetchThreats() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/threats", {
          headers: { "x-tenant-id": tenantId },
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Request failed with status ${response.status}`);
        }

        const result = (await response.json()) as ThreatsResponse;
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load threat timeline");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchThreats();

    return () => {
      cancelled = true;
    };
  }, [selectedTenantId]);

  if (tenantsLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-slate-800" />
          <Skeleton className="h-4 w-96 bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (tenantsError || error) {
    return (
      <Card className="border-red-900/50 bg-slate-900">
        <CardContent className="p-6 text-sm text-red-400">{truncateMessage(tenantsError ?? error ?? "")}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <Radar className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-semibold text-slate-50">Threat Timeline</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">Real-time reconstruction of AI agent incidents.</p>
      </div>

      {/* Timeline metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !data ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl bg-slate-800" />
          ))
        ) : (
          <>
            <MetricCard
              title="Critical Incidents"
              value={data.metrics.criticalIncidents.toLocaleString("en-US")}
              icon={AlertOctagon}
              accentClass="text-red-400"
            />
            <MetricCard
              title="High Risk Events"
              value={data.metrics.highRiskEvents.toLocaleString("en-US")}
              icon={AlertTriangle}
              accentClass="text-yellow-400"
            />
            <MetricCard
              title="Policies Triggered"
              value={data.metrics.policiesTriggered.toLocaleString("en-US")}
              icon={ShieldAlert}
              accentClass="text-blue-400"
            />
            <MetricCard
              title="Agents Involved"
              value={data.metrics.agentsInvolved.toLocaleString("en-US")}
              icon={Bot}
              accentClass="text-purple-400"
            />
          </>
        )}
      </div>

      {/* Incident stream */}
      <section>
        <h2 className="text-lg font-semibold text-slate-50">Incident Stream</h2>
        <Separator className="my-4 bg-slate-800" />

        {loading || !data ? (
          <div className="space-y-4">
            {Array.from({ length: SKELETON_INCIDENT_COUNT }).map((_, index) => (
              <Skeleton key={index} className="h-56 rounded-xl bg-slate-800" />
            ))}
          </div>
        ) : data.incidents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ShieldCheck className="h-10 w-10 text-green-500" />
            <h3 className="text-lg font-semibold text-slate-50">No incidents recorded</h3>
            <p className="text-sm text-slate-400">
              No blocked or flagged actions have been recorded for this tenant yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.incidents.map((incident, index) => (
              <IncidentCard
                key={incident.incidentId}
                incident={incident}
                index={index}
                onInvestigate={setActiveIncident}
              />
            ))}
          </div>
        )}
      </section>

      {/* Investigation panel */}
      <Sheet open={activeIncident !== null} onOpenChange={(open) => !open && setActiveIncident(null)}>
        <SheetContent className="border-slate-800 bg-slate-900 text-slate-50">
          {activeIncident ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-slate-50">Incident Investigation</SheetTitle>
                <SheetDescription className="text-slate-400">
                  {formatRelativeTime(activeIncident.timestamp)} &middot; {activeIncident.incidentId.slice(0, 8)}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 overflow-y-auto px-4 pb-4">
                <Badge variant="outline" className={severityBadgeClass(activeIncident.severity)}>
                  {activeIncident.severity}
                </Badge>

                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Agent</dt>
                    <dd className="font-medium text-slate-200">{activeIncident.agentName}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Action Type</dt>
                    <dd className="font-medium text-slate-200">
                      {activeIncident.actionType.replace(/_/g, " ")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Policy</dt>
                    <dd className="font-medium text-slate-200">{activeIncident.policyName ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Cost</dt>
                    <dd className="flex items-center gap-1 font-medium text-slate-200">
                      <DollarSign className="h-3 w-3 text-green-400" />
                      {activeIncident.costUsd !== null ? costFormatter.format(activeIncident.costUsd) : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Timestamp</dt>
                    <dd className="font-medium text-slate-200">
                      {new Date(activeIncident.timestamp).toLocaleString("en-US")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Policy Result</dt>
                    <dd>
                      <Badge variant="outline" className={policyResultBadgeClass(activeIncident.policyResult)}>
                        {activeIncident.policyResult}
                      </Badge>
                    </dd>
                  </div>
                </dl>

                <Separator className="bg-slate-800" />

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Input Summary</h4>
                  <p className="mt-1 text-sm text-slate-300">{activeIncident.inputSummary}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Output Summary</h4>
                  <p className="mt-1 text-sm text-slate-300">{activeIncident.outputSummary}</p>
                </div>

                <Separator className="bg-slate-800" />

                <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-300">
                    <Sparkles className="h-4 w-4" />
                    AI Explanation
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300">{activeIncident.explanation}</p>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
