"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  GitBranch,
  Loader2,
  Search,
  Shield,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import type { CausalGraph, GraphNode } from "@/app/api/actions/[id]/graph/route";
import type { PolicyResult } from "@/lib/db/types";

interface RecentAction {
  id: string;
  agentName: string;
  actionType: string;
  policyResult: PolicyResult;
  inputSummary: string;
  createdAt: string;
}

// ─── Severity helper ──────────────────────────────────────────────────────────

function getSeverity(result: PolicyResult) {
  if (result === "blocked")
    return { label: "Critical", color: "#ef4444", glow: "rgba(239,68,68,0.5)", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" };
  if (result === "flagged")
    return { label: "High", color: "#f59e0b", glow: "rgba(245,158,11,0.5)", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" };
  return { label: "Low", color: "#22c55e", glow: "rgba(34,197,94,0.5)", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)" };
}

// ─── Custom node components (must be defined outside render) ─────────────────

interface CustomNodeData extends Record<string, unknown> {
  label: string;
  sublabel?: string;
  status?: GraphNode["status"];
  riskScore?: number;
}

const glass: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.78)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "12px",
  padding: "12px 14px",
  minWidth: "158px",
  maxWidth: "200px",
  color: "white",
  fontFamily: "inherit",
  fontSize: "13px",
  cursor: "default",
  position: "relative",
};

const iconBox = (accent: string): React.CSSProperties => ({
  width: 30,
  height: 30,
  borderRadius: 8,
  background: `${accent}22`,
  border: `1px solid ${accent}44`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

const handleSx: React.CSSProperties = {
  width: 8,
  height: 8,
  background: "rgba(255,255,255,0.18)",
  border: "none",
};

function AgentNode({ data }: NodeProps) {
  const d = data as CustomNodeData;
  return (
    <>
      <Handle type="source" position={Position.Right} style={handleSx} />
      <div
        style={{
          ...glass,
          border: "1px solid rgba(6,182,212,0.32)",
          boxShadow: "0 0 22px rgba(6,182,212,0.14), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        {/* active dot */}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 8px #22c55e",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={iconBox("#06b6d4")}>
            <Bot style={{ width: 14, height: 14, color: "#06b6d4" }} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#06b6d4", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>
              Agent
            </p>
            <p style={{ fontWeight: 600, fontSize: 13, color: "white", lineHeight: 1.25 }}>{d.label}</p>
            {d.sublabel && (
              <p style={{ fontSize: 11, color: "rgba(148,163,184,0.65)", marginTop: 2, lineHeight: 1.3 }}>{d.sublabel}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ActionNode({ data }: NodeProps) {
  const d = data as CustomNodeData;
  return (
    <>
      <Handle type="target" position={Position.Left} style={handleSx} />
      <div
        style={{
          ...glass,
          border: "1px solid rgba(168,85,247,0.32)",
          boxShadow: "0 0 22px rgba(168,85,247,0.14), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={iconBox("#a855f7")}>
            <Zap style={{ width: 14, height: 14, color: "#a855f7" }} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>
              Action
            </p>
            <p style={{ fontWeight: 600, fontSize: 13, color: "white", lineHeight: 1.25, textTransform: "capitalize" }}>{d.label}</p>
            {d.sublabel && (
              <p style={{ fontSize: 11, color: "rgba(148,163,184,0.65)", marginTop: 2, lineHeight: 1.3 }}>{d.sublabel}</p>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={handleSx} />
    </>
  );
}

function PolicyNode({ data }: NodeProps) {
  const d = data as CustomNodeData;
  return (
    <>
      <Handle type="target" position={Position.Left} style={handleSx} />
      <div
        style={{
          ...glass,
          border: "1px solid rgba(245,158,11,0.32)",
          boxShadow: "0 0 22px rgba(245,158,11,0.14), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={iconBox("#f59e0b")}>
            <Shield style={{ width: 14, height: 14, color: "#f59e0b" }} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>
              Policy
            </p>
            <p style={{ fontWeight: 600, fontSize: 13, color: "white", lineHeight: 1.25, textTransform: "capitalize" }}>{d.label}</p>
            {d.sublabel && (
              <p style={{ fontSize: 11, color: "rgba(148,163,184,0.65)", marginTop: 2, lineHeight: 1.3 }}>{d.sublabel}</p>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={handleSx} />
    </>
  );
}

function OutcomeNode({ data }: NodeProps) {
  const d = data as CustomNodeData;
  const status = d.status ?? "allowed";
  const accent = status === "blocked" ? "#ef4444" : status === "flagged" ? "#f59e0b" : "#22c55e";
  const Icon = status === "blocked" ? XCircle : status === "flagged" ? AlertTriangle : CheckCircle2;

  return (
    <>
      <Handle type="target" position={Position.Left} style={handleSx} />
      <div
        style={{
          ...glass,
          border: `1px solid ${accent}44`,
          boxShadow: `0 0 28px ${accent}22, 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={iconBox(accent)}>
            <Icon style={{ width: 14, height: 14, color: accent }} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>
              Outcome
            </p>
            <p style={{ fontWeight: 700, fontSize: 14, color: accent, lineHeight: 1.25 }}>{d.label}</p>
            {d.sublabel && (
              <p style={{ fontSize: 11, color: "rgba(148,163,184,0.65)", marginTop: 2, lineHeight: 1.3 }}>{d.sublabel}</p>
            )}
          </div>
        </div>
        {d.riskScore !== undefined && (
          <div
            style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px",
              borderRadius: 6,
              background: `${accent}14`,
              border: `1px solid ${accent}33`,
            }}
          >
            <span style={{ fontSize: 10, color: "rgba(148,163,184,0.7)", fontWeight: 600 }}>Risk</span>
            <span style={{ fontSize: 12, color: accent, fontWeight: 700 }}>{d.riskScore}/100</span>
          </div>
        )}
      </div>
    </>
  );
}

const nodeTypes = {
  agentNode: AgentNode,
  actionNode: ActionNode,
  policyNode: PolicyNode,
  outcomeNode: OutcomeNode,
};

const NODE_TYPE_MAP: Record<GraphNode["type"], string> = {
  agent: "agentNode",
  action: "actionNode",
  policy: "policyNode",
  outcome: "outcomeNode",
};

// ─── Graph builder ────────────────────────────────────────────────────────────

function buildFlowGraph(graph: CausalGraph): { nodes: Node[]; edges: Edge[] } {
  const positions: Record<string, { x: number; y: number }> = {
    agent:   { x: 30,  y: 90 },
    action:  { x: 270, y: 90 },
    policy:  { x: 510, y: 90 },
    outcome: { x: 750, y: 90 },
  };

  const nodes: Node[] = graph.nodes.map((n) => ({
    id: n.id,
    type: NODE_TYPE_MAP[n.type] ?? "agentNode",
    position: positions[n.id] ?? { x: 0, y: 0 },
    data: {
      label: n.label,
      sublabel: n.sublabel,
      status: n.status,
      riskScore: n.riskScore,
    },
  }));

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: true,
    style: { stroke: "rgba(148,163,184,0.25)", strokeWidth: 1.5 },
    labelStyle: { fill: "rgba(148,163,184,0.6)", fontSize: 10, fontFamily: "inherit" },
    labelBgStyle: { fill: "rgba(15,23,42,0.85)", stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 },
    labelBgPadding: [4, 6] as [number, number],
    labelBgBorderRadius: 4,
  }));

  return { nodes, edges };
}

// ─── Graph canvas ─────────────────────────────────────────────────────────────

function GraphCanvas({ graph }: { graph: CausalGraph }) {
  const { nodes, edges } = useMemo(() => buildFlowGraph(graph), [graph]);

  return (
    <div
      style={{
        position: "relative",
        height: 320,
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
        background: "#020617",
      }}
    >
      {/* Radial governance glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.07) 0%, rgba(168,85,247,0.04) 40%, transparent 70%)",
        }}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.5 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        style={{ background: "transparent", position: "relative", zIndex: 2 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          color="rgba(148,163,184,0.07)"
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

// ─── Legend row ───────────────────────────────────────────────────────────────

const LEGEND = [
  { label: "Agent",   color: "#06b6d4" },
  { label: "Action",  color: "#a855f7" },
  { label: "Policy",  color: "#f59e0b" },
  { label: "Blocked", color: "#ef4444" },
  { label: "Flagged", color: "#f59e0b" },
  { label: "Allowed", color: "#22c55e" },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CausalGraphPage() {
  const { selectedTenantId, loading: tenantsLoading } = useTenants();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("id");
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [actionsLoading, setActionsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(preselectedId);
  const [graph, setGraph] = useState<CausalGraph | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Fetch incident list
  useEffect(() => {
    if (!selectedTenantId) return;
    const tenantId = selectedTenantId;
    let cancelled = false;

    async function fetchActions() {
      setActionsLoading(true);
      try {
        const res = await fetch("/api/ingest", {
          headers: { "x-tenant-id": tenantId },
        });
        if (res.ok) {
          const data = (await res.json()) as {
            actions: {
              id: string;
              agentName: string;
              action_type: string;
              policy_result: string;
              input_summary: string;
              created_at: string;
            }[];
          };
          if (!cancelled)
            setRecentActions(
              data.actions.slice(0, 50).map((a) => ({
                id: a.id,
                agentName: a.agentName,
                actionType: a.action_type,
                policyResult: a.policy_result as PolicyResult,
                inputSummary: a.input_summary,
                createdAt: a.created_at,
              }))
            );
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setActionsLoading(false);
      }
    }

    fetchActions();
    return () => { cancelled = true; };
  }, [selectedTenantId]);

  const loadGraph = useCallback(
    async (actionId: string) => {
      if (!selectedTenantId) return;
      setSelectedId(actionId);
      setGraphLoading(true);
      setGraphError(null);
      setGraph(null);

      try {
        const res = await fetch(`/api/actions/${actionId}/graph`, {
          headers: { "x-tenant-id": selectedTenantId },
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Request failed: ${res.status}`);
        }
        const data = (await res.json()) as CausalGraph;
        setGraph(data);
      } catch (err) {
        setGraphError(err instanceof Error ? err.message : "Failed to load graph");
      } finally {
        setGraphLoading(false);
      }
    },
    [selectedTenantId]
  );

  // Auto-load from URL ?id=
  useEffect(() => {
    if (!preselectedId || !selectedTenantId) return;
    const tenantId = selectedTenantId;
    const actionId = preselectedId;
    let cancelled = false;

    async function autoLoad() {
      setSelectedId(actionId);
      setGraphLoading(true);
      setGraphError(null);
      setGraph(null);

      try {
        const res = await fetch(`/api/actions/${actionId}/graph`, {
          headers: { "x-tenant-id": tenantId },
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Request failed: ${res.status}`);
        }
        const data = (await res.json()) as CausalGraph;
        if (!cancelled) setGraph(data);
      } catch (err) {
        if (!cancelled) setGraphError(err instanceof Error ? err.message : "Failed to load graph");
      } finally {
        if (!cancelled) setGraphLoading(false);
      }
    }

    autoLoad();
    return () => { cancelled = true; };
  }, [preselectedId, selectedTenantId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return recentActions;
    return recentActions.filter(
      (a) =>
        a.agentName.toLowerCase().includes(q) ||
        a.actionType.toLowerCase().includes(q) ||
        a.inputSummary.toLowerCase().includes(q)
    );
  }, [recentActions, search]);

  if (tenantsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-muted" />
        <Skeleton className="h-96 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Causal Investigation Graph</h1>
          <Badge variant="outline" className="border-chart-5/30 bg-chart-5/10 text-chart-5">
            Visual Reconstruction
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Select an incident to visualize its causal chain: agent → action → policy → outcome.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Incident selector ─────────────────────────────────────────────── */}
        <div className="space-y-3 lg:col-span-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search incidents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border bg-secondary pl-9 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Recent Incidents
              </CardTitle>
            </CardHeader>
            <CardContent
              className="max-h-[520px] overflow-y-auto p-0"
              style={{ scrollbarColor: "rgba(255,255,255,0.14) rgba(15,23,42,0.6)" }}
            >
              {actionsLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl bg-muted" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No incidents found.</p>
              ) : (
                <div className="space-y-px p-2">
                  {filtered.map((action) => {
                    const sev = getSeverity(action.policyResult);
                    const isSelected = selectedId === action.id;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => loadGraph(action.id)}
                        className={cn(
                          "group w-full rounded-xl border p-3.5 text-left transition-all duration-200",
                          isSelected
                            ? "border-white/10 bg-white/6"
                            : "border-transparent hover:border-white/6 hover:bg-white/3"
                        )}
                      >
                        {/* Severity + time */}
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                              style={{ background: sev.color, boxShadow: `0 0 5px ${sev.glow}` }}
                            />
                            <span
                              className="text-xs font-bold uppercase tracking-wider"
                              style={{ color: sev.color }}
                            >
                              {sev.label}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground/50 flex-shrink-0">
                            {formatRelativeTime(action.createdAt)}
                          </span>
                        </div>

                        {/* Agent name */}
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {action.agentName}
                        </p>

                        {/* Action type */}
                        <p className="mt-0.5 text-xs capitalize text-muted-foreground line-clamp-1">
                          {action.actionType.replace(/_/g, " ")}
                        </p>

                        {/* Input preview */}
                        {action.inputSummary && (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/45">
                            {action.inputSummary}
                          </p>
                        )}

                        {/* Policy badge */}
                        <div className="mt-2">
                          <span
                            className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              background: sev.bg,
                              border: `1px solid ${sev.border}`,
                              color: sev.color,
                            }}
                          >
                            {action.policyResult.toUpperCase()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Graph canvas ──────────────────────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          {!selectedId ? (
            <div className="flex h-[560px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card">
              <GitBranch className="h-12 w-12 text-muted-foreground/30" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Select an incident</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose from the list to visualize its causal chain
                </p>
              </div>
            </div>
          ) : graphLoading ? (
            <div className="flex h-[560px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-sm text-muted-foreground">Building causal graph…</p>
            </div>
          ) : graphError ? (
            <div className="flex h-[560px] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-card">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{graphError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedId && loadGraph(selectedId)}
                className="border-border text-foreground hover:bg-secondary"
              >
                Retry
              </Button>
            </div>
          ) : graph ? (
            <div className="space-y-3">
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
                {LEGEND.map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color, boxShadow: `0 0 5px ${item.color}88` }}
                    />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>

              <GraphCanvas graph={graph} />

              {/* Node detail cards */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {graph.nodes.map((node) => {
                  const accent =
                    node.type === "agent" ? "#06b6d4"
                    : node.type === "action" ? "#a855f7"
                    : node.type === "policy" ? "#f59e0b"
                    : node.status === "blocked" ? "#ef4444"
                    : node.status === "flagged" ? "#f59e0b"
                    : "#22c55e";
                  return (
                    <div
                      key={node.id}
                      className="rounded-xl border border-border bg-card p-3"
                      style={{ borderLeftColor: accent, borderLeftWidth: 2 }}
                    >
                      <p
                        className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: accent }}
                      >
                        {node.type}
                      </p>
                      <p className="mt-1 text-sm font-semibold capitalize text-foreground leading-tight">
                        {node.label}
                      </p>
                      {node.sublabel && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {node.sublabel}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
