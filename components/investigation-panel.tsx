"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Building2,
  Database,
  DollarSign,
  FileSpreadsheet,
  Globe,
  Loader2,
  Mail,
  Share2,
  ShieldAlert,
  ShieldQuestion,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useRouter } from "next/navigation";
import { cn, formatRelativeTime, policyResultBadgeClass, truncateMessage } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import type { Agent, AgentAction, Policy } from "@/lib/db/types";
import type { RiskLevel, SimilarIncident } from "@/lib/db/investigation";

interface InvestigationResponse {
  action: AgentAction;
  agent: Agent | null;
  policy: Policy | null;
  riskScore: number;
  riskLevel: RiskLevel;
  affectedAssets: string[];
  aiExplanation: string;
  similarIncidents: SimilarIncident[];
}

interface InvestigationPanelProps {
  actionId: string | null;
  onOpenChange: (open: boolean) => void;
}

const costFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const ASSET_ICONS: Record<string, LucideIcon> = {
  Database: Database,
  CRM: Building2,
  "External API": Globe,
  "Email System": Mail,
  "Data Export": FileSpreadsheet,
  "Internal Tool": Wrench,
};

function assetIcon(asset: string): LucideIcon {
  return ASSET_ICONS[asset] ?? ShieldQuestion;
}

function riskLevelClasses(level: RiskLevel): { text: string; bg: string; border: string; bar: string } {
  switch (level) {
    case "critical":
      return { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", bar: "bg-destructive" };
    case "high":
      return { text: "text-warning", bg: "bg-warning/10", border: "border-warning/30", bar: "bg-warning" };
    case "medium":
      return { text: "text-chart-1", bg: "bg-chart-1/10", border: "border-chart-1/30", bar: "bg-chart-1" };
    case "low":
      return { text: "text-success", bg: "bg-success/10", border: "border-success/30", bar: "bg-success" };
  }
}

function similarityPercent(similarity: number): number {
  return Math.round(Math.max(0, Math.min(1, similarity)) * 100);
}

export function InvestigationPanel({ actionId, onOpenChange }: InvestigationPanelProps) {
  const { selectedTenantId } = useTenants();
  const router = useRouter();

  const [history, setHistory] = useState<string[]>([]);
  const [data, setData] = useState<InvestigationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastActionId, setLastActionId] = useState(actionId);

  // Reset navigation history whenever a fresh investigation is opened.
  if (actionId !== lastActionId) {
    setLastActionId(actionId);
    setHistory([]);
  }

  const currentId = history.length > 0 ? history[history.length - 1] : actionId;

  useEffect(() => {
    if (!currentId || !selectedTenantId) {
      return;
    }

    const tenantId = selectedTenantId;
    let cancelled = false;

    async function fetchInvestigation() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/actions/${currentId}/investigate`, {
          headers: { "x-tenant-id": tenantId },
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Request failed with status ${response.status}`);
        }

        const result = (await response.json()) as InvestigationResponse;
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load investigation");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchInvestigation();

    return () => {
      cancelled = true;
    };
  }, [currentId, selectedTenantId]);

  const riskColors = data ? riskLevelClasses(data.riskLevel) : null;

  return (
    <Sheet open={actionId !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-border bg-card text-foreground data-[side=right]:sm:max-w-2xl"
      >
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {history.length > 0 ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setHistory((prev) => prev.slice(0, -1))}
                  className="text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back</span>
                </Button>
              ) : null}
              <ShieldAlert className="h-5 w-5 text-accent" />
              <SheetTitle className="text-foreground">Investigation</SheetTitle>
            </div>
            {currentId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  router.push(`/dashboard/graph?id=${currentId}`);
                }}
                className="shrink-0 border-chart-5/30 bg-chart-5/10 text-chart-5 hover:bg-chart-5/20 hover:text-chart-5"
              >
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
                Open Graph
              </Button>
            )}
          </div>
          <SheetDescription className="font-mono text-xs text-muted-foreground">
            Action ID: {currentId ?? "—"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {loading || !data ? (
            error ? (
              <p className="text-sm text-destructive">{truncateMessage(error)}</p>
            ) : (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={cn("text-sm uppercase tracking-wider", riskColors?.border, riskColors?.bg, riskColors?.text)}>
                  {data.riskLevel}
                </Badge>
                <Badge variant="outline" className={policyResultBadgeClass(data.action.policy_result)}>
                  {data.action.policy_result}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(data.action.created_at)}</span>
              </div>

              {/* Section 1: Why Blocked */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {data.action.policy_result === "blocked" ? "Why Blocked" : "Why Flagged"}
                </h3>
                <Separator className="my-3 bg-muted" />
                {data.policy ? (
                  <div className="space-y-3">
                    <Badge
                      variant="outline"
                      className="border-chart-1/30 bg-chart-1/10 px-3 py-1 text-sm text-chart-1"
                    >
                      Matched Policy: {data.policy.rule_type.replace(/_/g, " ")}
                    </Badge>
                    <div className="rounded-md border border-border bg-background/50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Policy Configuration
                      </p>
                      <div className="space-y-1">
                        {Object.entries(data.policy.rule_config).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{key}</span>
                            <span className="font-mono text-foreground">
                              {Array.isArray(value) ? value.join(", ") : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Heuristic anomaly detection triggered.</p>
                )}
              </section>

              {/* Section 2: Risk Score */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Risk Score</h3>
                <Separator className="my-3 bg-muted" />
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-5xl font-bold", riskColors?.text)}>{data.riskScore}</span>
                  <span className="text-lg text-muted-foreground">/ 100</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={cn("h-full rounded-full", riskColors?.bar)}
                    initial={{ width: 0 }}
                    animate={{ width: `${data.riskScore}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </section>

              {/* Section 3: Affected Assets */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Affected Assets</h3>
                <Separator className="my-3 bg-muted" />
                {data.affectedAssets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No specific systems identified.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.affectedAssets.map((asset) => {
                      const Icon = assetIcon(asset);
                      return (
                        <Badge
                          key={asset}
                          variant="outline"
                          className="flex items-center gap-1.5 border-border px-3 py-1 text-sm text-muted-foreground"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {asset}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Section 4: AI Risk Assessment */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Risk Assessment</h3>
                <Separator className="my-3 bg-muted" />
                <div className="rounded-lg border border-chart-1/30 bg-chart-1/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-chart-1">
                    <Sparkles className="h-4 w-4" />
                    Security Briefing
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{data.aiExplanation}</p>
                </div>
              </section>

              {/* Action details */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Action Details</h3>
                <Separator className="my-3 bg-muted" />
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <Bot className="h-3.5 w-3.5" /> Agent
                    </dt>
                    <dd className="font-medium text-foreground">{data.agent?.name ?? "Unknown agent"}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Action Type</dt>
                    <dd className="font-medium text-foreground">{data.action.action_type.replace(/_/g, " ")}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" /> Cost
                    </dt>
                    <dd className="font-medium text-foreground">
                      {data.action.cost_usd !== null ? costFormatter.format(data.action.cost_usd) : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Timestamp</dt>
                    <dd className="font-medium text-foreground">
                      {new Date(data.action.created_at).toLocaleString("en-US")}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Input Summary</p>
                    <p className="mt-1 text-sm text-muted-foreground">{data.action.input_summary}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Output Summary</p>
                    <p className="mt-1 text-sm text-muted-foreground">{data.action.output_summary}</p>
                  </div>
                </div>
              </section>

              {/* Section 5: Similar Incidents */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Similar Incidents</h3>
                <Separator className="my-3 bg-muted" />
                {data.similarIncidents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No semantically similar incidents found.</p>
                ) : (
                  <div className="space-y-2">
                    {data.similarIncidents.map((incident) => (
                      <button
                        key={incident.id}
                        type="button"
                        onClick={() => setHistory((prev) => [...prev, incident.id])}
                        className="w-full rounded-md border border-border bg-background/40 p-3 text-left transition-colors hover:border-accent/50 hover:bg-secondary/50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{incident.agentName}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {similarityPercent(incident.similarity)}% match
                            </span>
                            <Badge variant="outline" className={policyResultBadgeClass(incident.policyResult)}>
                              {incident.policyResult}
                            </Badge>
                          </div>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{incident.inputSummary}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <AlertTriangle className="h-3 w-3" />
                          {formatRelativeTime(incident.createdAt)} &middot; click to investigate
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
