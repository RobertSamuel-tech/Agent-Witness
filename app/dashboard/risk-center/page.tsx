"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  DollarSign,
  ListChecks,
  Shield,
  ShieldAlert,
  ShieldCheck,
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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function levelAccentClass(level: GovernanceLevel): string {
  switch (level) {
    case "LOW":
      return "text-success";
    case "MEDIUM":
      return "text-warning";
    case "HIGH":
      return "text-destructive";
  }
}

function levelBarClass(level: GovernanceLevel): string {
  switch (level) {
    case "LOW":
      return "bg-success";
    case "MEDIUM":
      return "bg-warning";
    case "HIGH":
      return "bg-destructive";
  }
}

function levelBadgeClass(level: GovernanceLevel): string {
  switch (level) {
    case "LOW":
      return "border-success/30 bg-success/10 text-success";
    case "MEDIUM":
      return "border-warning/30 bg-warning/10 text-warning";
    case "HIGH":
      return "border-destructive/30 bg-destructive/10 text-destructive";
  }
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

    async function fetchRiskCenter() {
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
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load risk center");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRiskCenter();

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
            <KpiCard
              title="Total Actions"
              value={data.metrics.totalActions.toLocaleString("en-US")}
              icon={ListChecks}
              accentClass="text-chart-1"
            />
            <KpiCard
              title="Blocked Actions"
              value={data.metrics.blockedActions.toLocaleString("en-US")}
              icon={ShieldAlert}
              accentClass="text-destructive"
            />
            <KpiCard
              title="Flagged Actions"
              value={data.metrics.flaggedActions.toLocaleString("en-US")}
              icon={AlertTriangle}
              accentClass="text-warning"
            />
            <KpiCard
              title="Active Policies"
              value={data.metrics.policiesActive.toLocaleString("en-US")}
              icon={Shield}
              accentClass="text-accent"
            />
            <KpiCard
              title="Agents Monitored"
              value={data.metrics.agentsMonitored.toLocaleString("en-US")}
              icon={Bot}
              accentClass="text-chart-5"
            />
            <KpiCard
              title="Total AI Spend"
              value={currencyFormatter.format(data.metrics.totalAiSpend)}
              icon={DollarSign}
              accentClass="text-success"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* 3. Top Risk Agents */}
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
                        <TableCell colSpan={4}>
                          <Skeleton className="h-6 w-full bg-muted" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : data.topRiskAgents.length === 0 ? (
                    <TableRow className="border-border">
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No agents found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.topRiskAgents.map((agent) => (
                      <TableRow key={agent.agentName} className="border-border">
                        <TableCell className="text-foreground">{agent.agentName}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold",
                            agent.riskScore > 0 ? "text-destructive" : "text-muted-foreground"
                          )}
                        >
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

        {/* 4. Policy Breakdown */}
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
                          className={cn(
                            "h-full rounded-full",
                            policy.hitCount > 0 ? "bg-destructive" : "bg-muted"
                          )}
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
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full bg-muted" />
                  </TableCell>
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
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      {incident.agentName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      {incident.actionType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{incident.policyName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={policyResultBadgeClass(incident.policyResult)}>
                      {incident.policyResult}
                    </Badge>
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
    </div>
  );
}
