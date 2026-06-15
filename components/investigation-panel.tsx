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
      return { text: "text-red-400", bg: "bg-red-950/50", border: "border-red-800", bar: "bg-red-500" };
    case "high":
      return { text: "text-orange-400", bg: "bg-orange-950/50", border: "border-orange-800", bar: "bg-orange-500" };
    case "medium":
      return { text: "text-yellow-400", bg: "bg-yellow-950/50", border: "border-yellow-800", bar: "bg-yellow-500" };
    case "low":
      return { text: "text-green-400", bg: "bg-green-950/50", border: "border-green-800", bar: "bg-green-500" };
  }
}

function similarityPercent(similarity: number): number {
  return Math.round(Math.max(0, Math.min(1, similarity)) * 100);
}

export function InvestigationPanel({ actionId, onOpenChange }: InvestigationPanelProps) {
  const { selectedTenantId } = useTenants();

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
        className="w-full overflow-y-auto border-slate-800 bg-slate-900 text-slate-50 data-[side=right]:sm:max-w-2xl"
      >
        <SheetHeader>
          <div className="flex items-center gap-2">
            {history.length > 0 ? (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setHistory((prev) => prev.slice(0, -1))}
                className="text-slate-300 hover:bg-slate-800 hover:text-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            ) : null}
            <ShieldAlert className="h-5 w-5 text-blue-400" />
            <SheetTitle className="text-slate-50">Investigation</SheetTitle>
          </div>
          <SheetDescription className="font-mono text-xs text-slate-500">
            Action ID: {currentId ?? "—"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {loading || !data ? (
            error ? (
              <p className="text-sm text-red-400">{truncateMessage(error)}</p>
            ) : (
              <div className="flex items-center justify-center py-16 text-slate-500">
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
                <span className="text-xs text-slate-500">{formatRelativeTime(data.action.created_at)}</span>
              </div>

              {/* Section 1: Why Blocked */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  {data.action.policy_result === "blocked" ? "Why Blocked" : "Why Flagged"}
                </h3>
                <Separator className="my-3 bg-slate-800" />
                {data.policy ? (
                  <div className="space-y-3">
                    <Badge
                      variant="outline"
                      className="border-blue-800 bg-blue-950/40 px-3 py-1 text-sm text-blue-300"
                    >
                      Matched Policy: {data.policy.rule_type.replace(/_/g, " ")}
                    </Badge>
                    <div className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Policy Configuration
                      </p>
                      <div className="space-y-1">
                        {Object.entries(data.policy.rule_config).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">{key}</span>
                            <span className="font-mono text-slate-200">
                              {Array.isArray(value) ? value.join(", ") : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Heuristic anomaly detection triggered.</p>
                )}
              </section>

              {/* Section 2: Risk Score */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Risk Score</h3>
                <Separator className="my-3 bg-slate-800" />
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-5xl font-bold", riskColors?.text)}>{data.riskScore}</span>
                  <span className="text-lg text-slate-500">/ 100</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
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
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Affected Assets</h3>
                <Separator className="my-3 bg-slate-800" />
                {data.affectedAssets.length === 0 ? (
                  <p className="text-sm text-slate-500">No specific systems identified.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.affectedAssets.map((asset) => {
                      const Icon = assetIcon(asset);
                      return (
                        <Badge
                          key={asset}
                          variant="outline"
                          className="flex items-center gap-1.5 border-slate-700 px-3 py-1 text-sm text-slate-300"
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
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">AI Risk Assessment</h3>
                <Separator className="my-3 bg-slate-800" />
                <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-300">
                    <Sparkles className="h-4 w-4" />
                    Security Briefing
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300">{data.aiExplanation}</p>
                </div>
              </section>

              {/* Action details */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Action Details</h3>
                <Separator className="my-3 bg-slate-800" />
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-slate-400">
                      <Bot className="h-3.5 w-3.5" /> Agent
                    </dt>
                    <dd className="font-medium text-slate-200">{data.agent?.name ?? "Unknown agent"}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Action Type</dt>
                    <dd className="font-medium text-slate-200">{data.action.action_type.replace(/_/g, " ")}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-slate-400">
                      <DollarSign className="h-3.5 w-3.5" /> Cost
                    </dt>
                    <dd className="font-medium text-slate-200">
                      {data.action.cost_usd !== null ? costFormatter.format(data.action.cost_usd) : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Timestamp</dt>
                    <dd className="font-medium text-slate-200">
                      {new Date(data.action.created_at).toLocaleString("en-US")}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Input Summary</p>
                    <p className="mt-1 text-sm text-slate-300">{data.action.input_summary}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Output Summary</p>
                    <p className="mt-1 text-sm text-slate-300">{data.action.output_summary}</p>
                  </div>
                </div>
              </section>

              {/* Section 5: Similar Incidents */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Similar Incidents</h3>
                <Separator className="my-3 bg-slate-800" />
                {data.similarIncidents.length === 0 ? (
                  <p className="text-sm text-slate-500">No semantically similar incidents found.</p>
                ) : (
                  <div className="space-y-2">
                    {data.similarIncidents.map((incident) => (
                      <button
                        key={incident.id}
                        type="button"
                        onClick={() => setHistory((prev) => [...prev, incident.id])}
                        className="w-full rounded-md border border-slate-800 bg-slate-950/40 p-3 text-left transition-colors hover:border-slate-700 hover:bg-slate-800/50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-200">{incident.agentName}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-400">
                              {similarityPercent(incident.similarity)}% match
                            </span>
                            <Badge variant="outline" className={policyResultBadgeClass(incident.policyResult)}>
                              {incident.policyResult}
                            </Badge>
                          </div>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-400">{incident.inputSummary}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
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
