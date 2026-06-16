"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, Power, Shield, User, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import type { EmergencyControl } from "@/lib/db/emergency-controls";

function StatusCard({ control, loading }: { control: EmergencyControl | null; loading: boolean }) {
  const isPaused = control?.is_agent_execution_paused ?? false;

  return (
    <Card
      className={cn(
        "border-2 transition-all duration-500",
        loading
          ? "border-border"
          : isPaused
            ? "border-destructive/50 bg-destructive/5"
            : "border-success/50 bg-success/5"
      )}
    >
      <CardContent className="flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:text-left">
        {/* Icon */}
        <div
          className={cn(
            "flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl",
            loading
              ? "bg-muted"
              : isPaused
                ? "bg-destructive/20"
                : "bg-success/20"
          )}
        >
          {loading ? (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          ) : isPaused ? (
            <XCircle className="h-10 w-10 text-destructive" />
          ) : (
            <CheckCircle2 className="h-10 w-10 text-success" />
          )}
        </div>

        {/* Status text */}
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Global Agent Status
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-10 w-48 bg-muted" />
          ) : (
            <p
              className={cn(
                "mt-1 text-4xl font-bold tracking-tight",
                isPaused ? "text-destructive" : "text-success"
              )}
            >
              {isPaused ? "PAUSED" : "ACTIVE"}
            </p>
          )}
          {!loading && control && (
            <div className="mt-2 flex flex-wrap justify-center gap-3 sm:justify-start">
              {isPaused && control.paused_by && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  Paused by: <span className="text-foreground">{control.paused_by}</span>
                </div>
              )}
              {isPaused && control.updated_at && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {formatRelativeTime(control.updated_at)}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PauseDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (reason: string, pausedBy: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  const [pausedBy, setPausedBy] = useState("");

  function handleConfirm() {
    if (!reason.trim() || !pausedBy.trim()) return;
    onConfirm(reason.trim(), pausedBy.trim());
  }

  function handleOpenChange(v: boolean) {
    if (!loading) {
      setReason("");
      setPausedBy("");
      onOpenChange(v);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-destructive/30 bg-card text-foreground sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/20">
              <Power className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-foreground">Pause All Agents</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                This will immediately block all incoming agent actions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                All /api/ingest requests will return HTTP 423 until you resume. This affects all AI
                agents connected to this tenant.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground" htmlFor="paused-by">
              Your name / ID
            </Label>
            <Input
              id="paused-by"
              value={pausedBy}
              onChange={(e) => setPausedBy(e.target.value)}
              placeholder="e.g. Jane Smith / security-team"
              className="border-border bg-secondary text-foreground placeholder:text-muted-foreground"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground" htmlFor="reason">
              Reason for emergency pause
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the security incident or reason for pausing..."
              rows={3}
              className="border-border bg-secondary text-foreground placeholder:text-muted-foreground"
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
            className="border-border text-foreground hover:bg-secondary"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !reason.trim() || !pausedBy.trim()}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Pausing...
              </>
            ) : (
              <>
                <Power className="mr-2 h-4 w-4" />
                Pause All Agents
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResumeDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent className="border-success/30 bg-card text-foreground sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/20">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <DialogTitle className="text-foreground">Resume Agent Execution</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                All agents will be allowed to resume normal operations.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2">
          <div className="rounded-lg border border-success/30 bg-success/10 p-3">
            <p className="text-sm text-success">
              The emergency pause will be lifted. All /api/ingest requests will proceed through normal
              policy evaluation.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-border text-foreground hover:bg-secondary"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resuming...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Resume All Agents
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ControlCenterPage() {
  const { selectedTenantId, loading: tenantsLoading } = useTenants();
  const [control, setControl] = useState<EmergencyControl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const retry = useCallback(() => setRefreshIndex((i) => i + 1), []);

  useEffect(() => {
    if (!selectedTenantId) return;
    const tenantId = selectedTenantId;
    let cancelled = false;

    async function fetchStatus() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/control/status", {
          headers: { "x-tenant-id": tenantId },
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Request failed: ${res.status}`);
        }

        const data = (await res.json()) as EmergencyControl;
        if (!cancelled) setControl(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to fetch control status");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStatus();
    return () => { cancelled = true; };
  }, [selectedTenantId, refreshIndex]);

  async function handlePause(reason: string, pausedBy: string) {
    if (!selectedTenantId) return;
    setActionLoading(true);

    try {
      const res = await fetch("/api/control/pause", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": selectedTenantId,
        },
        body: JSON.stringify({ reason, pausedBy }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed: ${res.status}`);
      }

      const data = (await res.json()) as EmergencyControl;
      setControl(data);
      setPauseDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause agents");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResume() {
    if (!selectedTenantId) return;
    setActionLoading(true);

    try {
      const res = await fetch("/api/control/resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": selectedTenantId,
        },
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed: ${res.status}`);
      }

      const data = (await res.json()) as EmergencyControl;
      setControl(data);
      setResumeDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume agents");
    } finally {
      setActionLoading(false);
    }
  }

  const isPaused = control?.is_agent_execution_paused ?? false;

  if (tenantsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-muted" />
        <Skeleton className="h-40 rounded-xl bg-muted" />
        <Skeleton className="h-64 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Control Center</h1>
          <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
            Emergency Controls
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Executive emergency controls for global AI agent management.
        </p>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Global Status Card */}
      <StatusCard control={control} loading={loading} />

      {/* Action buttons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setPauseDialogOpen(true)}
          disabled={loading || isPaused || actionLoading}
          className={cn(
            "group relative overflow-hidden rounded-xl border-2 p-6 text-left transition-all duration-300",
            "border-destructive/40 bg-card hover:border-destructive hover:bg-destructive/10",
            "disabled:cursor-not-allowed disabled:opacity-40"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-destructive/20">
              <Power className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Pause All Agents</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Immediately halt all AI agent actions. Returns HTTP 423 to all ingest requests.
              </p>
              {isPaused && (
                <Badge variant="outline" className="mt-2 border-destructive/30 bg-destructive/10 text-destructive">
                  Already paused
                </Badge>
              )}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setResumeDialogOpen(true)}
          disabled={loading || !isPaused || actionLoading}
          className={cn(
            "group relative overflow-hidden rounded-xl border-2 p-6 text-left transition-all duration-300",
            "border-success/40 bg-card hover:border-success hover:bg-success/10",
            "disabled:cursor-not-allowed disabled:opacity-40"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-success/20">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Resume Agent Execution</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Lift the emergency pause and restore normal AI operations.
              </p>
              {!isPaused && !loading && (
                <Badge variant="outline" className="mt-2 border-success/30 bg-success/10 text-success">
                  Currently active
                </Badge>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Audit info */}
      {control && !loading && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Audit Information</CardTitle>
            </div>
          </CardHeader>
          <Separator className="bg-border" />
          <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</p>
              <p className={cn("mt-1 font-semibold", isPaused ? "text-destructive" : "text-success")}>
                {isPaused ? "Execution Paused" : "Execution Active"}
              </p>
            </div>
            {isPaused && control.paused_by && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Paused By</p>
                <p className="mt-1 font-semibold text-foreground">{control.paused_by}</p>
              </div>
            )}
            {isPaused && control.reason && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reason</p>
                <p className="mt-1 text-sm text-foreground">{control.reason}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Updated</p>
              <p className="mt-1 text-sm text-foreground">
                {new Date(control.updated_at).toLocaleString("en-US")}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Control ID</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{control.id}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <PauseDialog
        open={pauseDialogOpen}
        onOpenChange={setPauseDialogOpen}
        onConfirm={handlePause}
        loading={actionLoading}
      />
      <ResumeDialog
        open={resumeDialogOpen}
        onOpenChange={setResumeDialogOpen}
        onConfirm={handleResume}
        loading={actionLoading}
      />
    </div>
  );
}
