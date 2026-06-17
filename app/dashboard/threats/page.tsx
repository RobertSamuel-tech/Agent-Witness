"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  Bot,
  Radar,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatRelativeTime, truncateMessage } from "@/lib/utils";
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
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-warning/30 bg-warning/10 text-warning";
}

function severityDotClass(severity: ThreatSeverity): string {
  return severity === "CRITICAL" ? "bg-destructive" : "bg-warning";
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
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={severityBadgeClass(incident.severity)}>
                {incident.severity}
              </Badge>
              <span className="text-sm font-semibold text-foreground">{incident.agentName}</span>
              <Badge variant="outline" className="border-border text-xs text-muted-foreground">
                {incident.actionType.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">{formatRelativeTime(incident.timestamp)}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInvestigate(incident)}
                className="border-border text-foreground hover:bg-secondary"
              >
                Investigate
              </Button>
            </div>
          </div>

          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{incident.inputSummary}</p>

          <Separator className="my-4 bg-muted" />

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
                  <span className="absolute left-[5px] top-3 h-full w-px bg-muted" />
                ) : null}
                <span
                  className={cn(
                    "relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                    eventIndex === incident.events.length - 1
                      ? severityDotClass(incident.severity)
                      : "bg-border"
                  )}
                />
                <div className="flex flex-1 items-baseline justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{event.label}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
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
  const router = useRouter();

  const [data, setData] = useState<ThreatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <Skeleton className="h-8 w-64 bg-muted" />
          <Skeleton className="h-4 w-96 bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (tenantsError || error) {
    return (
      <Card className="border-destructive/30 bg-card">
        <CardContent className="p-6 text-sm text-destructive">{truncateMessage(tenantsError ?? error ?? "")}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <Radar className="h-6 w-6 text-accent" />
          <h1 className="text-2xl font-semibold text-foreground">Threat Timeline</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Real-time reconstruction of AI agent incidents.</p>
      </div>

      {/* Timeline metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !data ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl bg-muted" />
          ))
        ) : (
          <>
            <MetricCard
              title="Critical Incidents"
              value={data.metrics.criticalIncidents.toLocaleString("en-US")}
              icon={AlertOctagon}
              accentClass="text-destructive"
            />
            <MetricCard
              title="High Risk Events"
              value={data.metrics.highRiskEvents.toLocaleString("en-US")}
              icon={AlertTriangle}
              accentClass="text-warning"
            />
            <MetricCard
              title="Policies Triggered"
              value={data.metrics.policiesTriggered.toLocaleString("en-US")}
              icon={ShieldAlert}
              accentClass="text-chart-1"
            />
            <MetricCard
              title="Agents Involved"
              value={data.metrics.agentsInvolved.toLocaleString("en-US")}
              icon={Bot}
              accentClass="text-chart-5"
            />
          </>
        )}
      </div>

      {/* Incident stream */}
      <section>
        <h2 className="text-lg font-semibold text-foreground">Incident Stream</h2>
        <Separator className="my-4 bg-muted" />

        {loading || !data ? (
          <div className="space-y-4">
            {Array.from({ length: SKELETON_INCIDENT_COUNT }).map((_, index) => (
              <Skeleton key={index} className="h-56 rounded-xl bg-muted" />
            ))}
          </div>
        ) : data.incidents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ShieldCheck className="h-10 w-10 text-success" />
            <h3 className="text-lg font-semibold text-foreground">No incidents recorded</h3>
            <p className="text-sm text-muted-foreground">
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
                onInvestigate={(inc) => router.push(`/dashboard/replay/${inc.incidentId}`)}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
