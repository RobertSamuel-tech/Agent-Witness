"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Database,
  DollarSign,
  Eye,
  Film,
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

export default function DashboardPage() {
  const {
    tenants,
    selectedTenantId,
    loading: tenantsLoading,
    error: tenantsError,
    refetch: refetchTenants,
  } = useTenants();

  const router = useRouter();

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
          <Skeleton className="h-8 w-48 bg-muted" />
          <Skeleton className="h-4 w-64 bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (tenantsError) {
    return (
      <Card className="border-destructive/30 bg-card">
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-destructive">{truncateMessage(tenantsError)}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchTenants}
            className="border-border text-foreground hover:bg-secondary"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (tenants.length === 0 || !selectedTenantId) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <Database className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">No tenants found</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            AgentWitness has no tenants yet. Bootstrap the database by inserting a row into the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-muted-foreground">tenants</code>{" "}
            table (see <code className="rounded bg-muted px-1 py-0.5 text-xs text-muted-foreground">lib/db/schema.sql</code>),
            then reload this page.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchTenants}
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
        <h1 className="text-2xl font-semibold text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats?.tenantName
            ? `Live audit metrics for ${stats.tenantName}.`
            : "Live audit metrics for your agents."}
        </p>
      </div>

      {statsError ? (
        <Card className="border-destructive/30 bg-card">
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <p className="text-sm text-destructive">{truncateMessage(statsError)}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={retryStats}
              className="border-border text-foreground hover:bg-secondary"
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
                <Skeleton key={index} className="h-32 rounded-xl bg-muted" />
              ))
            ) : (
              <>
                <StatCard
                  title="Total Actions"
                  value={stats.totalActions.toLocaleString("en-US")}
                  icon={ListChecks}
                  accentClass="text-chart-1"
                />
                <StatCard
                  title="Blocked"
                  value={stats.blockedCount.toLocaleString("en-US")}
                  icon={ShieldAlert}
                  accentClass="text-destructive"
                />
                <StatCard
                  title="Flagged"
                  value={stats.flaggedCount.toLocaleString("en-US")}
                  icon={AlertTriangle}
                  accentClass="text-warning"
                />
                <StatCard
                  title="Avg Cost"
                  value={avgCostFormatter.format(stats.avgCost)}
                  icon={DollarSign}
                  accentClass="text-success"
                />
              </>
            )}
          </div>

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
              {!statsLoading && stats ? (
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {stats.activePolicies.toLocaleString("en-US")} Policies Active
                </Badge>
              ) : null}
            </div>
            <Separator className="my-4 bg-muted" />

            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Agent</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Result</TableHead>
                  <TableHead className="text-muted-foreground">Input Summary</TableHead>
                  <TableHead className="text-muted-foreground">Time</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statsLoading || !stats ? (
                  Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                    <TableRow key={index} className="border-border">
                      <TableCell colSpan={6}>
                        <Skeleton className="h-6 w-full bg-muted" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : stats.recentActions.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      No actions recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentActions.map((action) => {
                    return (
                      <TableRow
                        key={action.id}
                        className={cn(
                          "border-border",
                          action.policyResult === "blocked" &&
                            "border-l-2 border-l-destructive bg-destructive/10"
                        )}
                      >
                        <TableCell>
                          <Badge variant="outline" className="border-border text-muted-foreground">
                            {action.agentName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-border text-muted-foreground">
                            {action.actionType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={policyResultBadgeClass(action.policyResult)}>
                            {action.policyResult}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {truncateMessage(action.inputSummary, INPUT_SUMMARY_MAX_LENGTH)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatRelativeTime(action.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInvestigateId(action.id)}
                              className="border-border text-foreground hover:bg-secondary"
                            >
                              <InvestigateIcon policyResult={action.policyResult} className="h-3.5 w-3.5" />
                              Investigate
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/dashboard/replay/${action.id}`)}
                              className="text-muted-foreground hover:text-foreground"
                              title="Black Box Replay"
                            >
                              <Film className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
