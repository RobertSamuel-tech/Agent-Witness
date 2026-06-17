"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, AlertTriangle, BarChart3, Bot, Brain, CreditCard, GitBranch, Menu, Power, Radar, ScrollText, Share2, Shield, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenants } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  { href: "/dashboard/executive",   label: "Executive",   icon: BarChart3   },
  { href: "/dashboard/risk-center", label: "Risk Center", icon: ShieldAlert },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/threats", label: "Threat Timeline", icon: Radar },
  { href: "/dashboard/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/dashboard/anomalies", label: "Semantic Search", icon: Brain },
  { href: "/dashboard/policies", label: "Policies", icon: Shield },
  { href: "/dashboard/live", label: "Live Stream", icon: Activity },
  { href: "/dashboard/graph", label: "Causal Graph", icon: Share2 },
  { href: "/dashboard/control-center", label: "Control Center", icon: Power },
  { href: "/dashboard/billing", label: "Plans & Billing", icon: CreditCard },
  { href: "/dashboard/architecture", label: "Architecture", icon: GitBranch },
] as const;

function getCurrentRouteLabel(pathname: string): string {
  if (pathname.startsWith("/dashboard/replay/")) return "AI Flight Recorder";
  if (pathname.startsWith("/dashboard/agents/")) return "Agent Trust Profile";
  const match = NAV_ITEMS.find((item) => item.href === pathname);
  return match?.label ?? "Executive";
}

function isNavActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/dashboard/agents") {
    return pathname === "/dashboard/agents" || pathname.startsWith("/dashboard/agents/");
  }
  return pathname === itemHref;
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
      ? "bg-success"
      : status === "disconnected"
        ? "bg-destructive"
        : "bg-muted-foreground";

  const textClass =
    status === "connected"
      ? "text-foreground"
      : status === "disconnected"
        ? "text-destructive"
        : "text-muted-foreground";

  const statusLabel =
    status === "connected" ? "Connected" : status === "disconnected" ? "Disconnected" : "Checking...";

  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
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
        "border-t border-sidebar-border p-4 text-xs",
        isDegraded && "border-destructive/30 bg-destructive/10"
      )}
    >
      {isDegraded ? (
        <div className="mb-2 flex items-center gap-1.5 text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>System degraded</span>
        </div>
      ) : null}
      <StatusRow label="Aurora" status={auroraStatus} />
      <StatusRow label="OpenRouter" status={openrouterStatus} />
      <div className="mt-2 text-muted-foreground">Tenant: {tenantName}</div>
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
    return <Skeleton className="h-8 w-36 bg-secondary" />;
  }

  if (error || tenants.length === 0) {
    return <span className="text-xs text-muted-foreground">No tenants</span>;
  }

  return (
    <Select value={selectedTenantId ?? undefined} onValueChange={handleChange}>
      <SelectTrigger className="w-44 border-border bg-secondary text-foreground">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-border bg-popover text-foreground">
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
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <Link href="/home" className="text-xl font-bold tracking-tight text-sidebar-foreground hover:text-accent transition-colors duration-200">
          AgentWitness
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <nav className="px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = isNavActive(item.href, pathname);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-colors duration-200",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
                    )}
                    <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      <SystemStatusWidget />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const breadcrumbLabel = getCurrentRouteLabel(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden h-full w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SidebarContent pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
            <span className="text-sm text-muted-foreground">
              Dashboard <span className="text-muted-foreground/50">/</span>{" "}
              <span className="text-foreground">{breadcrumbLabel}</span>
            </span>
          </div>

          <Badge
            variant="outline"
            className="hidden items-center gap-2 border-border text-muted-foreground sm:flex"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
            Live Monitoring
          </Badge>

          <TenantSwitcher />
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
