"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  Brain,
  DollarSign,
  Download,
  EyeOff,
  Globe,
  ListChecks,
  Loader2,
  SearchX,
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

interface ThreatSearchResult {
  id: string;
  agent_id: string;
  action_type: string;
  input_summary: string;
  output_summary: string;
  policy_result: PolicyResult;
  similarity: number;
  created_at: string;
}

interface ThreatQuery {
  label: string;
  icon: LucideIcon;
  query: string;
}

const THREAT_QUERIES: ThreatQuery[] = [
  { label: "PII Exposure", icon: EyeOff, query: "Agent accessed or exported personally identifiable information" },
  { label: "Data Exfiltration", icon: Download, query: "Agent exported data to an external destination" },
  { label: "Cost Abuse", icon: DollarSign, query: "Agent performed an unusually high cost action" },
  { label: "Suspicious Domains", icon: Globe, query: "Agent sent data to an unfamiliar or suspicious domain" },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function levelAccentClass(level: GovernanceLevel): string {
  switch (level) {
    case "LOW":
      return "text-green-400";
    case "MEDIUM":
      return "text-yellow-400";
    case "HIGH":
      return "text-red-400";
  }
}

function levelBarClass(level: GovernanceLevel): string {
  switch (level) {
    case "LOW":
      return "bg-green-500";
    case "MEDIUM":
      return "bg-yellow-500";
    case "HIGH":
      return "bg-red-500";
  }
}

function levelBadgeClass(level: GovernanceLevel): string {
  switch (level) {
    case "LOW":
      return "border-green-800 bg-green-950/50 text-green-400";
    case "MEDIUM":
      return "border-yellow-800 bg-yellow-950/50 text-yellow-400";
    case "HIGH":
      return "border-red-800 bg-red-950/50 text-red-400";
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

function similarityPercent(similarity: number): number {
  return Math.round(Math.max(0, Math.min(1, similarity)) * 100);
}

export default function RiskCenterPage() {
  const { selectedTenantId, loading: tenantsLoading, error: tenantsError } = useTenants();

  const [data, setData] = useState<RiskCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const [activeThreat, setActiveThreat] = useState<string | null>(null);
  const [threatResults, setThreatResults] = useState<ThreatSearchResult[]>([]);
  const [threatLoading, setThreatLoading] = useState(false);
  const [threatError, setThreatError] = useState<string | null>(null);

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

  async function runThreatQuery(threat: ThreatQuery) {
    if (!selectedTenantId) return;

    setActiveThreat(threat.label);
    setThreatLoading(true);
    setThreatError(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": selectedTenantId },
        body: JSON.stringify({ query: threat.query, limit: 5 }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed with status ${response.status}`);
      }

      const result = (await response.json()) as { results: ThreatSearchResult[] };
      setThreatResults(result.results);
    } catch (err) {
      setThreatError(err instanceof Error ? err.message : "Threat search failed");
      setThreatResults([]);
    } finally {
      setThreatLoading(false);
    }
  }

  if (tenantsLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-slate-800" />
          <Skeleton className="h-4 w-96 bg-slate-800" />
        </div>
        <Skeleton className="h-40 rounded-xl bg-slate-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: SKELETON_KPI_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (tenantsError || error) {
    return (
      <Card className="border-red-900/50 bg-slate-900">
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-red-400">{truncateMessage(tenantsError ?? error ?? "")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
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
          <h1 className="text-2xl font-semibold text-slate-50">AI Risk Center</h1>
          <Badge variant="outline" className="border-blue-800 bg-blue-900/30 text-blue-400">
            Executive View
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Live AI governance posture, computed directly from Aurora PostgreSQL.
        </p>
      </div>

      {/* 1. Governance Score Hero */}
      {loading || !data ? (
        <Skeleton className="h-40 rounded-xl bg-slate-800" />
      ) : (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center justify-center">
                <span className={cn("text-6xl font-bold leading-none", levelAccentClass(data.governanceScore.level))}>
                  {data.governanceScore.score}
                </span>
                <span className="mt-1 text-xs uppercase tracking-wider text-slate-500">/ 100</span>
              </div>
              <div className="h-16 w-px bg-slate-800" />
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className={cn("h-5 w-5", levelAccentClass(data.governanceScore.level))} />
                  <h2 className="text-lg font-semibold text-slate-50">Governance Score</h2>
                  <Badge variant="outline" className={levelBadgeClass(data.governanceScore.level)}>
                    {data.governanceScore.level} RISK
                  </Badge>
                </div>
                <div className="mt-3 w-64 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={cn("h-2 rounded-full", levelBarClass(data.governanceScore.level))}
                    style={{ width: `${data.governanceScore.score}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-400">
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
            <Skeleton key={index} className="h-32 rounded-xl bg-slate-800" />
          ))
        ) : (
          <>
            <KpiCard
              title="Total Actions"
              value={data.metrics.totalActions.toLocaleString("en-US")}
              icon={ListChecks}
              accentClass="text-blue-400"
            />
            <KpiCard
              title="Blocked Actions"
              value={data.metrics.blockedActions.toLocaleString("en-US")}
              icon={ShieldAlert}
              accentClass="text-red-400"
            />
            <KpiCard
              title="Flagged Actions"
              value={data.metrics.flaggedActions.toLocaleString("en-US")}
              icon={AlertTriangle}
              accentClass="text-yellow-400"
            />
            <KpiCard
              title="Active Policies"
              value={data.metrics.policiesActive.toLocaleString("en-US")}
              icon={Shield}
              accentClass="text-emerald-400"
            />
            <KpiCard
              title="Agents Monitored"
              value={data.metrics.agentsMonitored.toLocaleString("en-US")}
              icon={Bot}
              accentClass="text-purple-400"
            />
            <KpiCard
              title="Total AI Spend"
              value={currencyFormatter.format(data.metrics.totalAiSpend)}
              icon={DollarSign}
              accentClass="text-green-400"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* 3. Top Risk Agents */}
        <section>
          <h2 className="text-lg font-semibold text-slate-50">Top Risk Agents</h2>
          <Separator className="my-4 bg-slate-800" />
          <Card className="border-slate-800 bg-slate-900">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Agent</TableHead>
                    <TableHead className="text-right text-slate-400">Risk Score</TableHead>
                    <TableHead className="text-right text-slate-400">Blocked</TableHead>
                    <TableHead className="text-right text-slate-400">Flagged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading || !data ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index} className="border-slate-800">
                        <TableCell colSpan={4}>
                          <Skeleton className="h-6 w-full bg-slate-800" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : data.topRiskAgents.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                        No agents found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.topRiskAgents.map((agent) => (
                      <TableRow key={agent.agentName} className="border-slate-800">
                        <TableCell className="text-slate-200">{agent.agentName}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold",
                            agent.riskScore > 0 ? "text-red-400" : "text-slate-400"
                          )}
                        >
                          {agent.riskScore}
                        </TableCell>
                        <TableCell className="text-right text-slate-400">{agent.blockedCount}</TableCell>
                        <TableCell className="text-right text-slate-400">{agent.flaggedCount}</TableCell>
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
          <h2 className="text-lg font-semibold text-slate-50">Policy Breakdown</h2>
          <Separator className="my-4 bg-slate-800" />
          <Card className="border-slate-800 bg-slate-900">
            <CardContent className="space-y-4 p-6">
              {loading || !data ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-6 w-full bg-slate-800" />
                ))
              ) : data.policyBreakdown.length === 0 ? (
                <p className="text-center text-sm text-slate-500">No policies configured.</p>
              ) : (
                (() => {
                  const maxHits = Math.max(...data.policyBreakdown.map((p) => p.hitCount), 1);
                  return data.policyBreakdown.map((policy) => (
                    <div key={policy.policyName}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-slate-300">{policy.policyName}</span>
                        <span className="font-mono text-slate-400">{policy.hitCount}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            policy.hitCount > 0 ? "bg-red-500" : "bg-slate-700"
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
        <h2 className="text-lg font-semibold text-slate-50">Critical Incident Feed</h2>
        <Separator className="my-4 bg-slate-800" />
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800">
              <TableHead className="text-slate-400">Agent</TableHead>
              <TableHead className="text-slate-400">Type</TableHead>
              <TableHead className="text-slate-400">Policy</TableHead>
              <TableHead className="text-slate-400">Result</TableHead>
              <TableHead className="text-slate-400">Input Summary</TableHead>
              <TableHead className="text-right text-slate-400">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading || !data ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index} className="border-slate-800">
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full bg-slate-800" />
                  </TableCell>
                </TableRow>
              ))
            ) : data.incidents.length === 0 ? (
              <TableRow className="border-slate-800">
                <TableCell colSpan={6} className="text-center text-sm text-slate-500">
                  <div className="flex flex-col items-center gap-2 py-6">
                    <ShieldCheck className="h-8 w-8 text-green-500" />
                    No blocked actions recorded.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.incidents.map((incident, index) => (
                <TableRow
                  key={`${incident.timestamp}-${index}`}
                  className="border-l-2 border-l-red-500 border-slate-800 bg-red-950/30"
                >
                  <TableCell>
                    <Badge variant="outline" className="border-slate-700 text-slate-300">
                      {incident.agentName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-700 text-slate-300">
                      {incident.actionType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">{incident.policyName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={policyResultBadgeClass(incident.policyResult)}>
                      {incident.policyResult}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {truncateMessage(incident.inputSummary, INPUT_SUMMARY_MAX_LENGTH)}
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                    {formatRelativeTime(incident.timestamp)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {/* 6. Semantic Threat Discovery */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-50">
          <Brain className="h-5 w-5 text-blue-400" />
          Semantic Threat Discovery
        </h2>
        <Separator className="my-4 bg-slate-800" />
        <div className="flex flex-wrap gap-2">
          {THREAT_QUERIES.map((threat) => {
            const Icon = threat.icon;
            const isActive = activeThreat === threat.label;
            return (
              <Button
                key={threat.label}
                variant="outline"
                size="sm"
                onClick={() => void runThreatQuery(threat)}
                disabled={!selectedTenantId || threatLoading}
                className={cn(
                  "border-slate-700 text-slate-300 hover:bg-slate-800",
                  isActive && "border-blue-700 bg-blue-950/30 text-blue-300"
                )}
              >
                {isActive && threatLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                {threat.label}
              </Button>
            );
          })}
        </div>

        <div className="mt-4">
          {threatError ? (
            <Card className="border-red-900/50 bg-slate-900">
              <CardContent className="flex items-center gap-2 p-4 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4" />
                {truncateMessage(threatError)}
              </CardContent>
            </Card>
          ) : threatLoading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl bg-slate-800" />
              ))}
            </div>
          ) : activeThreat && threatResults.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <SearchX className="h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-400">
                No semantically similar actions found for &ldquo;{activeThreat}&rdquo;.
              </p>
            </div>
          ) : activeThreat && threatResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {threatResults.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-slate-800 bg-slate-900">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex w-full max-w-[140px] items-center gap-2">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${similarityPercent(result.similarity)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-slate-400">
                            {similarityPercent(result.similarity)}% match
                          </span>
                        </div>
                        <Badge variant="outline" className={policyResultBadgeClass(result.policy_result)}>
                          {result.policy_result}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm text-slate-300">{result.input_summary}</p>
                      <p className="text-xs text-slate-500">{formatRelativeTime(result.created_at)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Select a threat category above to run a live pgvector semantic search across this
              tenant&apos;s audit trail.
            </p>
          )}
        </div>
      </section>

      {/* 7. Executive Summary */}
      <section>
        <h2 className="text-lg font-semibold text-slate-50">Executive Summary</h2>
        <Separator className="my-4 bg-slate-800" />
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-6">
            {loading || !data ? (
              <Skeleton className="h-16 w-full bg-slate-800" />
            ) : (
              <p className="text-sm leading-relaxed text-slate-300">{data.executiveSummary}</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
