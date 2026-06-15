"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Database,
  DollarSign,
  Eye,
  ListChecks,
  ShieldAlert,
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
import { InvestigationPanel } from "@/components/investigation-panel";
import { cn, formatRelativeTime, policyResultBadgeClass, truncateMessage } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import type { PolicyResult } from "@/lib/db/types";

function InvestigateIcon({ policyResult, className }: { policyResult: PolicyResult; className?: string }) {
  if (policyResult === "blocked") return <AlertTriangle className={className} />;
  if (policyResult === "flagged") return <ShieldAlert className={className} />;
  return <Eye className={className} />;
}

const INPUT_SUMMARY_MAX_LENGTH = 80;
const SKELETON_ROW_COUNT = 5;

interface RecentAction {
  id: string;
  agentName: string;
  actionType: string;
  policyResult: PolicyResult;
  inputSummary: string;
  createdAt: string;
}

interface DashboardStats {
  totalActions: number;
  blockedCount: number;
  flaggedCount: number;
  allowedCount: number;
  avgCost: number;
  totalCostToday: number;
  activePolicies: number;
  tenantName: string;
  recentActions: RecentAction[];
}

const avgCostFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

function StatCard({
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

export default function DashboardPage() {
  const {
    tenants,
    selectedTenantId,
    loading: tenantsLoading,
    error: tenantsError,
    refetch: refetchTenants,
  } = useTenants();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsRefreshIndex, setStatsRefreshIndex] = useState(0);
  const [investigateId, setInvestigateId] = useState<string | null>(null);

  const retryStats = useCallback(() => {
    setStatsRefreshIndex((index) => index + 1);
  }, []);

  useEffect(() => {
    if (!selectedTenantId) {
      return;
    }

    const tenantId = selectedTenantId;
    let cancelled = false;

    async function fetchStats() {
      setStatsLoading(true);
      setStatsError(null);

      try {
        const response = await fetch("/api/stats", {
          headers: { "x-tenant-id": tenantId },
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as DashboardStats;
        if (!cancelled) {
          setStats(data);
        }
      } catch (err) {
        if (!cancelled) {
          setStatsError(err instanceof Error ? err.message : "Failed to load dashboard stats");
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [selectedTenantId, statsRefreshIndex]);

  if (tenantsLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-slate-800" />
          <Skeleton className="h-4 w-64 bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (tenantsError) {
    return (
      <Card className="border-red-900/50 bg-slate-900">
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-red-400">{truncateMessage(tenantsError)}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchTenants}
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (tenants.length === 0 || !selectedTenantId) {
    return (
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <Database className="h-10 w-10 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-50">No tenants found</h2>
          <p className="max-w-md text-sm text-slate-400">
            AgentWitness has no tenants yet. Bootstrap the database by inserting a row into the{" "}
            <code className="rounded bg-slate-800 px-1 py-0.5 text-xs text-slate-300">tenants</code>{" "}
            table (see <code className="rounded bg-slate-800 px-1 py-0.5 text-xs text-slate-300">lib/db/schema.sql</code>),
            then reload this page.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchTenants}
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
        <h1 className="text-2xl font-semibold text-slate-50">Overview</h1>
        <p className="mt-1 text-sm text-slate-400">
          {stats?.tenantName
            ? `Live audit metrics for ${stats.tenantName}.`
            : "Live audit metrics for your agents."}
        </p>
      </div>

      {statsError ? (
        <Card className="border-red-900/50 bg-slate-900">
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <p className="text-sm text-red-400">{truncateMessage(statsError)}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={retryStats}
              className="border-slate-700 text-slate-200 hover:bg-slate-800"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statsLoading || !stats ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-xl bg-slate-800" />
              ))
            ) : (
              <>
                <StatCard
                  title="Total Actions"
                  value={stats.totalActions.toLocaleString("en-US")}
                  icon={ListChecks}
                  accentClass="text-blue-400"
                />
                <StatCard
                  title="Blocked"
                  value={stats.blockedCount.toLocaleString("en-US")}
                  icon={ShieldAlert}
                  accentClass="text-red-400"
                />
                <StatCard
                  title="Flagged"
                  value={stats.flaggedCount.toLocaleString("en-US")}
                  icon={AlertTriangle}
                  accentClass="text-yellow-400"
                />
                <StatCard
                  title="Avg Cost"
                  value={avgCostFormatter.format(stats.avgCost)}
                  icon={DollarSign}
                  accentClass="text-green-400"
                />
              </>
            )}
          </div>

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-50">Recent Activity</h2>
              {!statsLoading && stats ? (
                <Badge variant="outline" className="border-slate-700 text-slate-300">
                  {stats.activePolicies.toLocaleString("en-US")} Policies Active
                </Badge>
              ) : null}
            </div>
            <Separator className="my-4 bg-slate-800" />

            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Agent</TableHead>
                  <TableHead className="text-slate-400">Type</TableHead>
                  <TableHead className="text-slate-400">Result</TableHead>
                  <TableHead className="text-slate-400">Input Summary</TableHead>
                  <TableHead className="text-slate-400">Time</TableHead>
                  <TableHead className="text-right text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statsLoading || !stats ? (
                  Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                    <TableRow key={index} className="border-slate-800">
                      <TableCell colSpan={6}>
                        <Skeleton className="h-6 w-full bg-slate-800" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : stats.recentActions.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={6} className="text-center text-sm text-slate-500">
                      No actions recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentActions.map((action) => {
                    return (
                      <TableRow
                        key={action.id}
                        className={cn(
                          "border-slate-800",
                          action.policyResult === "blocked" &&
                            "border-l-2 border-l-red-500 bg-red-950/30"
                        )}
                      >
                        <TableCell>
                          <Badge variant="outline" className="border-slate-700 text-slate-300">
                            {action.agentName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-slate-700 text-slate-300">
                            {action.actionType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={policyResultBadgeClass(action.policyResult)}>
                            {action.policyResult}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {truncateMessage(action.inputSummary, INPUT_SUMMARY_MAX_LENGTH)}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {formatRelativeTime(action.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInvestigateId(action.id)}
                            className="border-slate-700 text-slate-200 hover:bg-slate-800"
                          >
                            <InvestigateIcon policyResult={action.policyResult} className="h-3.5 w-3.5" />
                            Investigate
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </section>
        </>
      )}

      <InvestigationPanel actionId={investigateId} onOpenChange={(open) => !open && setInvestigateId(null)} />
    </div>
  );
}
