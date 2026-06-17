"use client";

import {
  BadgeCheck,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileBarChart2,
  Fingerprint,
  LayoutGrid,
  Minus,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Static plan data ─────────────────────────────────────────────────────────

const CURRENT_PLAN = {
  name: "Starter",
  status: "Active",
  monthlyCost: 299,
  renewal: "July 16, 2026",
  usage: {
    agents: { used: 1, max: 5 },
    policies: 3,
    actions: 6,
    governanceScore: 83,
  },
};

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: "$299",
    period: "/mo",
    description: "Governance visibility for teams getting started with AI agents.",
    accent: "#06b6d4",
    current: true,
    popular: false,
    features: [
      "Up to 5 AI Agents",
      "Risk Center",
      "Audit Log",
      "Threat Timeline",
      "Basic Policies",
    ],
    cta: "Current Plan",
    ctaDisabled: true,
  },
  {
    key: "growth",
    name: "Growth",
    price: "$999",
    period: "/mo",
    description: "Full governance suite for scaling AI agent deployments.",
    accent: "#a855f7",
    current: false,
    popular: true,
    features: [
      "Up to 50 AI Agents",
      "Semantic Search",
      "Live Agent Stream",
      "Causal Investigation Graph",
      "Advanced Governance Policies",
      "Priority Support",
    ],
    cta: "Upgrade to Growth",
    ctaDisabled: false,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: " pricing",
    description: "Dedicated governance infrastructure for regulated enterprise environments.",
    accent: "#f59e0b",
    current: false,
    popular: false,
    features: [
      "Unlimited Agents",
      "Compliance Reports",
      "SSO / SAML",
      "Custom Policy Frameworks",
      "Dedicated Environment",
      "Governance Copilot",
      "SLA Support",
    ],
    cta: "Contact Sales",
    ctaDisabled: false,
  },
] as const;

const FEATURE_MATRIX = [
  { feature: "Risk Center",         starter: true,  growth: true,  enterprise: true  },
  { feature: "Audit Log",           starter: true,  growth: true,  enterprise: true  },
  { feature: "Threat Timeline",     starter: true,  growth: true,  enterprise: true  },
  { feature: "Policies",            starter: true,  growth: true,  enterprise: true  },
  { feature: "Semantic Search",     starter: false, growth: true,  enterprise: true  },
  { feature: "Live Stream",         starter: false, growth: true,  enterprise: true  },
  { feature: "Causal Graph",        starter: false, growth: true,  enterprise: true  },
  { feature: "Compliance Reports",  starter: false, growth: false, enterprise: true  },
  { feature: "SSO / SAML",         starter: false, growth: false, enterprise: true  },
  { feature: "Dedicated Env.",      starter: false, growth: false, enterprise: true  },
] as const;

const ENTERPRISE_VALUE = [
  {
    icon: FileBarChart2,
    title: "Compliance Automation",
    body: "Generate audit-ready governance evidence for SOC 2, ISO 27001, and EU AI Act requirements.",
    accent: "#06b6d4",
  },
  {
    icon: Fingerprint,
    title: "Identity Federation",
    body: "Integrate with Okta, Azure AD, and any SAML 2.0 identity provider for zero-friction SSO.",
    accent: "#a855f7",
  },
  {
    icon: LayoutGrid,
    title: "Custom Governance",
    body: "Deploy organization-specific policy frameworks with JSONB-configured rule logic and versioning.",
    accent: "#f59e0b",
  },
  {
    icon: Building2,
    title: "Executive Reporting",
    body: "Board-ready AI governance summaries with risk trajectories, violation trends, and remediation status.",
    accent: "#22c55e",
  },
] as const;

const UPCOMING_INTEGRATIONS = [
  { label: "Stripe", icon: CreditCard },
  { label: "AWS Marketplace", icon: Sparkles },
  { label: "Usage-Based Billing", icon: Zap },
  { label: "Annual Contracts", icon: BadgeCheck },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function UsageBar({ used, max }: { used: number; max: number }) {
  const pct = Math.min((used / max) * 100, 100);
  const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";
  return (
    <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/6">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}88` }}
      />
    </div>
  );
}

function FeatureCheck({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return <CheckCircle2 className="mx-auto h-4 w-4 text-[#22c55e]" style={{ filter: "drop-shadow(0 0 4px #22c55e88)" }} />;
  }
  return <Minus className="mx-auto h-4 w-4 text-muted-foreground/30" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Plans &amp; Billing</h1>
          <Badge variant="outline" className="border-[#06b6d4]/30 bg-[#06b6d4]/10 text-[#06b6d4]">
            Starter Plan
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage subscription tiers, agent capacity, governance features, and enterprise licensing.
        </p>
      </div>

      {/* ── Current Subscription ─────────────────────────────────────────────── */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Current Subscription
            </CardTitle>
            <div className="flex items-center gap-1.5 rounded-full border border-[#22c55e]/25 bg-[#22c55e]/10 px-2.5 py-0.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22c55e]" />
              <span className="text-xs font-semibold text-[#22c55e]">Active</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">

            {/* Plan name */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Current Plan</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{CURRENT_PLAN.name}</p>
            </div>

            {/* Monthly cost */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Monthly Cost</p>
              <p className="mt-1 text-2xl font-bold text-foreground">${CURRENT_PLAN.monthlyCost}</p>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>

            {/* Agents */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Agents</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {CURRENT_PLAN.usage.agents.used}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ {CURRENT_PLAN.usage.agents.max}</span>
              </p>
              <UsageBar used={CURRENT_PLAN.usage.agents.used} max={CURRENT_PLAN.usage.agents.max} />
            </div>

            {/* Policies */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Policies</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{CURRENT_PLAN.usage.policies}</p>
              <p className="text-xs text-muted-foreground">active rules</p>
            </div>

            {/* Actions */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Actions Processed</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{CURRENT_PLAN.usage.actions}</p>
              <p className="text-xs text-muted-foreground">this cycle</p>
            </div>

            {/* Renewal */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Renewal</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{CURRENT_PLAN.renewal}</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                Auto-renews
              </div>
            </div>

          </div>

          {/* Governance score strip */}
          <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#22c55e]" />
              <span className="text-sm text-muted-foreground">Governance Score</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-32 rounded-full bg-white/6">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${CURRENT_PLAN.usage.governanceScore}%`,
                    background: "#22c55e",
                    boxShadow: "0 0 8px #22c55e66",
                  }}
                />
              </div>
              <span className="text-sm font-bold text-[#22c55e]">{CURRENT_PLAN.usage.governanceScore}/100</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Pricing Cards ────────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Available Plans</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className="relative flex flex-col rounded-xl border bg-card transition-all duration-200"
              style={{
                borderColor: plan.current
                  ? `${plan.accent}55`
                  : plan.popular
                    ? `${plan.accent}33`
                    : "rgba(255,255,255,0.06)",
                boxShadow: plan.popular
                  ? `0 0 32px ${plan.accent}14, 0 4px 16px rgba(0,0,0,0.3)`
                  : "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white"
                  style={{ background: plan.accent, boxShadow: `0 0 12px ${plan.accent}88` }}
                >
                  Most Popular
                </div>
              )}

              {/* Current plan indicator */}
              {plan.current && (
                <div
                  className="absolute left-0 top-0 h-full w-0.5 rounded-l-xl"
                  style={{ background: plan.accent }}
                />
              )}

              <div className="flex flex-col gap-4 p-6">
                {/* Plan header */}
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: plan.accent }}
                  >
                    {plan.name}
                  </p>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="mb-1 text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
                </div>

                <Separator className="bg-border" />

                {/* Feature list */}
                <ul className="flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        style={{ color: plan.accent, filter: `drop-shadow(0 0 3px ${plan.accent}88)` }}
                      />
                      <span className="text-sm text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  disabled={plan.ctaDisabled}
                  className={cn(
                    "mt-2 w-full font-semibold",
                    plan.ctaDisabled
                      ? "cursor-default border border-border bg-transparent text-muted-foreground"
                      : "text-white"
                  )}
                  style={
                    !plan.ctaDisabled
                      ? { background: plan.accent, boxShadow: `0 0 16px ${plan.accent}44` }
                      : undefined
                  }
                >
                  {plan.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature Comparison Table ─────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Feature Comparison</h2>
        <Card className="border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[46%] text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Feature
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: "#06b6d4" }}>
                  Starter
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: "#a855f7" }}>
                  Growth
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: "#f59e0b" }}>
                  Enterprise
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {FEATURE_MATRIX.map((row, i) => (
                <TableRow
                  key={row.feature}
                  className={cn(
                    "border-border transition-colors",
                    i % 2 === 0 ? "bg-transparent" : "bg-white/[0.015]"
                  )}
                >
                  <TableCell className="py-3 text-sm text-foreground/80">{row.feature}</TableCell>
                  <TableCell className="py-3 text-center">
                    <FeatureCheck enabled={row.starter} />
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <FeatureCheck enabled={row.growth} />
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <FeatureCheck enabled={row.enterprise} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* ── Enterprise Value ─────────────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Why Enterprise Customers Upgrade
          </h2>
          <Badge variant="outline" className="border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b]">
            Enterprise
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ENTERPRISE_VALUE.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="border-border bg-card transition-all duration-200 hover:border-white/10"
                style={{ borderLeftColor: item.accent, borderLeftWidth: 2 }}
              >
                <CardContent className="p-4">
                  <div
                    className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: `${item.accent}18`, border: `1px solid ${item.accent}33` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: item.accent }} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Upcoming Billing Integrations ────────────────────────────────────── */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Upcoming Billing Integrations
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Planned enterprise features — not yet available.</p>
            </div>
            <Badge variant="outline" className="border-border text-muted-foreground">
              Roadmap
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-3">
            {UPCOMING_INTEGRATIONS.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2.5 opacity-50"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{label}</span>
                <Badge variant="outline" className="ml-1 border-border px-1.5 py-0 text-[9px] text-muted-foreground/50">
                  Soon
                </Badge>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground/50">
            Contact <span className="text-muted-foreground">contact@agentwitness.io</span> to discuss enterprise licensing and billing arrangements.
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
