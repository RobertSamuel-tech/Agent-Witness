"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Brain, Menu, Radar, ScrollText, Shield, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HEALTH_POLL_INTERVAL_MS = 30000;

interface HealthResponse {
  status: "ok" | "degraded";
  services: {
    aurora: "connected" | "disconnected";
    openrouter: "connected" | "disconnected";
  };
  timestamp: string;
}

const NAV_ITEMS = [
  { href: "/dashboard/risk-center", label: "Risk Center", icon: ShieldAlert },
  { href: "/dashboard/threats", label: "Threat Timeline", icon: Radar },
  { href: "/dashboard/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/dashboard/anomalies", label: "Semantic Search", icon: Brain },
  { href: "/dashboard/policies", label: "Policies", icon: Shield },
] as const;

function getCurrentRouteLabel(pathname: string): string {
  const match = NAV_ITEMS.find((item) => item.href === pathname);
  return match?.label ?? "Risk Center";
}

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: "connected" | "disconnected" | "checking";
}) {
  const dotClass =
    status === "connected"
      ? "bg-green-500"
      : status === "disconnected"
        ? "bg-red-500"
        : "bg-slate-500";

  const textClass =
    status === "connected"
      ? "text-slate-300"
      : status === "disconnected"
        ? "text-red-400"
        : "text-slate-500";

  const statusLabel =
    status === "connected" ? "Connected" : status === "disconnected" ? "Disconnected" : "Checking...";

  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-400">{label}</span>
      <span className={cn("flex items-center gap-1.5", textClass)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
        {statusLabel}
      </span>
    </div>
  );
}

function SystemStatusWidget() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const { tenants, selectedTenantId } = useTenants();
  const tenantName = tenants.find((tenant) => tenant.id === selectedTenantId)?.name ?? "—";

  useEffect(() => {
    let cancelled = false;

    async function fetchHealth() {
      try {
        const response = await fetch("/api/health");
        const data = (await response.json()) as HealthResponse;
        if (!cancelled) {
          setHealth(data);
        }
      } catch (error) {
        console.error("Failed to fetch health status", error);
        if (!cancelled) {
          setHealth({
            status: "degraded",
            services: { aurora: "disconnected", openrouter: "disconnected" },
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    fetchHealth();
    const interval = setInterval(fetchHealth, HEALTH_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const isDegraded = health?.status === "degraded";
  const auroraStatus = health?.services.aurora ?? "checking";
  const openrouterStatus = health?.services.openrouter ?? "checking";

  return (
    <div
      className={cn(
        "border-t border-slate-800 p-4 text-xs",
        isDegraded && "border-red-900/50 bg-red-950/20"
      )}
    >
      {isDegraded ? (
        <div className="mb-2 flex items-center gap-1.5 text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>System degraded</span>
        </div>
      ) : null}
      <StatusRow label="Aurora" status={auroraStatus} />
      <StatusRow label="OpenRouter" status={openrouterStatus} />
      <div className="mt-2 text-slate-500">Tenant: {tenantName}</div>
    </div>
  );
}

function TenantSwitcher() {
  const { tenants, selectedTenantId, loading, error, selectTenant } = useTenants();

  function handleChange(value: string | null) {
    if (!value) {
      return;
    }
    selectTenant(value);
    window.location.reload();
  }

  if (loading) {
    return <Skeleton className="h-8 w-36 bg-slate-800" />;
  }

  if (error || tenants.length === 0) {
    return <span className="text-xs text-slate-500">No tenants</span>;
  }

  return (
    <Select value={selectedTenantId ?? undefined} onValueChange={handleChange}>
      <SelectTrigger className="w-44 border-slate-700 bg-slate-800 text-slate-200">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-slate-700 bg-slate-800 text-slate-200">
        {tenants.map((tenant) => (
          <SelectItem key={tenant.id} value={tenant.id}>
            {tenant.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-6">
        <span className="text-xl font-bold tracking-tight text-slate-50">AgentWitness</span>
      </div>
      <Separator className="bg-slate-800" />
      <ScrollArea className="flex-1">
        <nav className="px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "border-l-2 border-blue-500 bg-slate-800 text-white"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </ScrollArea>
      <SystemStatusWidget />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const breadcrumbLabel = getCurrentRouteLabel(pathname);

  return (
    <div className="dark flex min-h-screen bg-slate-950 text-slate-50">
      <aside className="hidden h-screen w-64 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 border-slate-800 bg-slate-900 p-0 text-slate-50">
          <SidebarContent pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:bg-slate-800 hover:text-slate-50 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
            <span className="text-sm text-slate-400">
              Dashboard <span className="text-slate-600">/</span>{" "}
              <span className="text-slate-200">{breadcrumbLabel}</span>
            </span>
          </div>

          <Badge
            variant="outline"
            className="hidden items-center gap-2 border-slate-700 text-slate-300 sm:flex"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Live Monitoring
          </Badge>

          <TenantSwitcher />
        </header>

        <main className="flex-1 overflow-auto bg-slate-950 p-8">{children}</main>
      </div>
    </div>
  );
}
