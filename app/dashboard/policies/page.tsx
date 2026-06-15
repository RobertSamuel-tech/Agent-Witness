"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  DollarSign,
  EyeOff,
  Globe,
  Loader2,
  Plus,
  Shield,
  Trash2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeTime, policyResultBadgeClass, truncateMessage } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import type { Policy, PolicyResult, PolicyRuleType } from "@/lib/db/types";

const SKELETON_CARD_COUNT = 3;

const RULE_TYPE_LABELS: Record<PolicyRuleType, string> = {
  cost_limit: "Cost Limit",
  data_masking: "Data Masking",
  domain_block: "Domain Block",
};

const RULE_TYPE_ICONS: Record<PolicyRuleType, LucideIcon> = {
  cost_limit: DollarSign,
  data_masking: EyeOff,
  domain_block: Globe,
};

const RULE_TYPE_OPTIONS: PolicyRuleType[] = ["cost_limit", "data_masking", "domain_block"];

function RuleTypeIcon({ ruleType, className }: { ruleType: PolicyRuleType; className: string }) {
  const Icon = RULE_TYPE_ICONS[ruleType] ?? Shield;
  return <Icon className={className} />;
}

interface SimulationResult {
  result: PolicyResult;
  matchedPolicyId?: string;
  reason?: string;
}

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

function buildRuleConfig(
  ruleType: PolicyRuleType,
  maxCost: string,
  blockPii: boolean,
  blockedDomains: string
): Record<string, unknown> | null {
  switch (ruleType) {
    case "cost_limit": {
      const parsed = Number(maxCost);
      if (maxCost.trim() === "" || Number.isNaN(parsed) || parsed < 0) return null;
      return { max_cost: parsed };
    }
    case "data_masking":
      return { block_pii: blockPii };
    case "domain_block": {
      const domains = blockedDomains
        .split(",")
        .map((domain) => domain.trim())
        .filter((domain) => domain.length > 0);
      return { blocked_domains: domains };
    }
  }
}

function PolicyCard({
  policy,
  onToggle,
  onDeleteRequest,
}: {
  policy: Policy;
  onToggle: (policy: Policy, active: boolean) => void;
  onDeleteRequest: (policy: Policy) => void;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <RuleTypeIcon ruleType={policy.rule_type} className="h-4 w-4 text-slate-400" />
          <Badge variant="outline" className="border-slate-700 text-slate-300">
            {RULE_TYPE_LABELS[policy.rule_type]}
          </Badge>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDeleteRequest(policy)}
          aria-label="Delete policy"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <pre className="overflow-x-auto rounded bg-slate-950 p-3 font-mono text-xs text-slate-300">
          {JSON.stringify(policy.rule_config, null, 2)}
        </pre>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={policy.is_active}
              onCheckedChange={(checked) => onToggle(policy, checked)}
            />
            <span className="text-sm text-slate-300">{policy.is_active ? "Active" : "Inactive"}</span>
          </div>
          <span className="text-xs text-slate-500">Created {formatRelativeTime(policy.created_at)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function NewPolicyDialog({
  open,
  onOpenChange,
  tenantId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
  onCreated: (policy: Policy) => void;
}) {
  const [ruleType, setRuleType] = useState<PolicyRuleType | null>(null);
  const [maxCost, setMaxCost] = useState("");
  const [blockPii, setBlockPii] = useState(false);
  const [blockedDomains, setBlockedDomains] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [creating, setCreating] = useState(false);

  function resetForm() {
    setRuleType(null);
    setMaxCost("");
    setBlockPii(false);
    setBlockedDomains("");
    setIsActive(true);
    setCreating(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  const ruleConfig = ruleType ? buildRuleConfig(ruleType, maxCost, blockPii, blockedDomains) : null;
  const canSubmit = ruleType !== null && ruleConfig !== null && tenantId !== null && !creating;

  async function handleSubmit() {
    if (!ruleType || !ruleConfig || !tenantId) return;

    setCreating(true);
    try {
      const response = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({ ruleType, ruleConfig, isActive }),
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Failed to create policy"));
      }

      const data = (await response.json()) as { policy: Policy };
      onCreated(data.policy);
      toast.success("Policy created");
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create policy");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg border-slate-800 bg-slate-900 text-slate-50">
        <DialogHeader>
          <DialogTitle>Create Policy</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-type">Rule Type</Label>
            <Select
              value={ruleType ?? undefined}
              onValueChange={(value) => {
                if (value) setRuleType(value as PolicyRuleType);
              }}
            >
              <SelectTrigger id="rule-type" className="w-full border-slate-700 bg-slate-800 text-slate-200">
                <SelectValue placeholder="Select a rule type" />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-800 text-slate-200">
                {RULE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {RULE_TYPE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ruleType === "cost_limit" ? (
            <div className="space-y-2">
              <Label htmlFor="max-cost">Max Cost (USD)</Label>
              <Input
                id="max-cost"
                type="number"
                step="0.01"
                min="0"
                value={maxCost}
                onChange={(event) => setMaxCost(event.target.value)}
                placeholder="0.50"
                className="border-slate-700 bg-slate-800 text-slate-200"
              />
            </div>
          ) : null}

          {ruleType === "data_masking" ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="block-pii"
                checked={blockPii}
                onCheckedChange={(checked) => setBlockPii(checked === true)}
              />
              <Label htmlFor="block-pii">Block PII (Personal Identifiable Information)</Label>
            </div>
          ) : null}

          {ruleType === "domain_block" ? (
            <div className="space-y-2">
              <Label htmlFor="blocked-domains">Blocked Domains (comma-separated)</Label>
              <Textarea
                id="blocked-domains"
                value={blockedDomains}
                onChange={(event) => setBlockedDomains(event.target.value)}
                placeholder="example.com, competitor.io"
                className="border-slate-700 bg-slate-800 text-slate-200"
              />
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Checkbox
              id="active-immediately"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
            <Label htmlFor="active-immediately">Active immediately</Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  policy,
  onOpenChange,
  onConfirm,
}: {
  policy: Policy | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (policy: Policy) => void;
}) {
  return (
    <Dialog open={policy !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-slate-800 bg-slate-900 text-slate-50">
        <DialogHeader>
          <DialogTitle>Delete policy?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-400">
          {policy
            ? `Delete ${RULE_TYPE_LABELS[policy.rule_type]} policy? This cannot be undone.`
            : null}
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (policy) onConfirm(policy);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PolicySimulationCard({ tenantId, policies }: { tenantId: string | null; policies: Policy[] }) {
  const [input, setInput] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  async function handleSimulate() {
    if (!tenantId || input.trim() === "") return;

    setSimulating(true);
    setResult(null);

    try {
      const response = await fetch("/api/policies/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({
          action: { inputSummary: input, outputSummary: "Simulated output", costUsd: 0 },
        }),
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Simulation failed"));
      }

      const data = (await response.json()) as SimulationResult;
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setSimulating(false);
    }
  }

  const matchedPolicy = policies.find((policy) => policy.id === result?.matchedPolicyId);

  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-50">
          <Zap className="h-4 w-4 text-blue-400" />
          Policy Simulation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Test an action summary... e.g., 'Agent exported 500 user records to CSV'"
          className="border-slate-700 bg-slate-800 text-slate-200"
        />
        <Button onClick={handleSimulate} disabled={simulating || input.trim() === "" || !tenantId}>
          {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Simulate
        </Button>

        {result ? (
          <div className="space-y-2 rounded-md border border-slate-800 bg-slate-950 p-4">
            <Badge variant="outline" className={policyResultBadgeClass(result.result)}>
              {result.result}
            </Badge>
            {result.result !== "allowed" ? (
              <div className="space-y-1 text-sm text-slate-400">
                {matchedPolicy ? (
                  <p>
                    Matched policy: <span className="text-slate-200">{RULE_TYPE_LABELS[matchedPolicy.rule_type]}</span>
                  </p>
                ) : null}
                {result.reason ? <p>{result.reason}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function PoliciesPage() {
  const {
    selectedTenantId,
    loading: tenantsLoading,
    error: tenantsError,
    refetch: refetchTenants,
  } = useTenants();

  const [policies, setPolicies] = useState<Policy[] | null>(null);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesError, setPoliciesError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null);

  useEffect(() => {
    if (!selectedTenantId) {
      return;
    }

    const tenantId = selectedTenantId;
    let cancelled = false;

    async function fetchPolicies() {
      setPoliciesLoading(true);
      setPoliciesError(null);

      try {
        const response = await fetch("/api/policies", {
          headers: { "x-tenant-id": tenantId },
        });

        if (!response.ok) {
          throw new Error(await extractErrorMessage(response, `Request failed with status ${response.status}`));
        }

        const data = (await response.json()) as { policies: Policy[] };
        if (!cancelled) {
          setPolicies(data.policies);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load policies";
          setPoliciesError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setPoliciesLoading(false);
        }
      }
    }

    fetchPolicies();

    return () => {
      cancelled = true;
    };
  }, [selectedTenantId, refreshIndex]);

  async function handleToggle(policy: Policy, active: boolean) {
    if (!selectedTenantId) return;
    const tenantId = selectedTenantId;

    setPolicies((prev) =>
      prev ? prev.map((item) => (item.id === policy.id ? { ...item, is_active: active } : item)) : prev
    );

    try {
      const response = await fetch(`/api/policies/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({ isActive: active }),
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Failed to update policy"));
      }

      toast.success(active ? "Policy activated" : "Policy deactivated");
    } catch (err) {
      setPolicies((prev) =>
        prev ? prev.map((item) => (item.id === policy.id ? { ...item, is_active: !active } : item)) : prev
      );
      toast.error(err instanceof Error ? err.message : "Failed to update policy");
    }
  }

  async function handleDeleteConfirm(policy: Policy) {
    if (!selectedTenantId) return;
    const tenantId = selectedTenantId;

    setDeleteTarget(null);
    setPolicies((prev) => (prev ? prev.filter((item) => item.id !== policy.id) : prev));

    try {
      const response = await fetch(`/api/policies/${policy.id}`, {
        method: "DELETE",
        headers: { "x-tenant-id": tenantId },
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Failed to delete policy"));
      }

      toast.success("Policy deleted");
    } catch (err) {
      setPolicies((prev) => (prev ? [...prev, policy] : prev));
      toast.error(err instanceof Error ? err.message : "Failed to delete policy");
    }
  }

  function handleCreated(policy: Policy) {
    setPolicies((prev) => (prev ? [policy, ...prev] : [policy]));
  }

  const isLoading = tenantsLoading || (selectedTenantId !== null && policiesLoading);
  const hasError = tenantsError ?? policiesError;
  const visiblePolicies = policies ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Policy Engine</h1>
          <p className="mt-1 text-sm text-slate-400">Real-time governance rules</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={!selectedTenantId}>
          <Plus className="h-4 w-4" />
          New Policy
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-48 rounded-xl bg-slate-800" />
          ))}
        </div>
      ) : hasError ? (
        <Card className="border-red-900/50 bg-slate-900">
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">{truncateMessage(hasError)}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchTenants();
                setRefreshIndex((index) => index + 1);
              }}
              className="border-slate-700 text-slate-200 hover:bg-slate-800"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : visiblePolicies.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
            <Shield className="h-12 w-12 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-50">No policies configured.</h2>
            <p className="max-w-md text-sm text-slate-400">
              Create a policy to govern agent actions in real-time.
            </p>
            <Button onClick={() => setDialogOpen(true)} disabled={!selectedTenantId} className="mt-2">
              <Plus className="h-4 w-4" />
              New Policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visiblePolicies.map((policy) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              onToggle={handleToggle}
              onDeleteRequest={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <PolicySimulationCard tenantId={selectedTenantId} policies={visiblePolicies} />

      <NewPolicyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenantId={selectedTenantId}
        onCreated={handleCreated}
      />

      <DeleteConfirmDialog
        policy={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
