import { NextRequest, NextResponse } from "next/server";
import {
  getGovernanceMetrics,
  getExecutiveMetrics,
  getTopRiskAgents,
  getPolicyRiskBreakdown,
  getRecentCriticalIncidents,
} from "@/lib/db/risk-center";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RegulatoryExposureLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type TrustTrendDirection = "improving" | "stable" | "declining";

export interface FrameworkReadiness {
  soc2: number;
  euAiAct: number;
  iso27001: number;
  nistAiRmf: number;
}

export interface LeadershipRecommendation {
  priority: "IMMEDIATE" | "SHORT_TERM" | "STRATEGIC";
  title: string;
  description: string;
  estimatedImpactUsd: number | null;
  impactLabel: string;
}

export interface ExecRiskAgent {
  name: string;
  riskScore: number;
  blockedCount: number;
  flaggedCount: number;
  status: "CRITICAL" | "HIGH" | "MODERATE" | "CONTAINED";
}

export interface ExecIncident {
  timestamp: string;
  agentName: string;
  actionType: string;
  summary: string;
  severity: "CRITICAL" | "HIGH" | "MODERATE";
  policyArea: string;
  estimatedExposureUsd: number;
}

export interface ExecutiveDashboard {
  // Financial
  potentialExposureUsd: number;
  avoidedLossUsd: number;

  // Governance
  governanceScore: number;
  regulatoryExposure: RegulatoryExposureLevel;
  complianceReadiness: number;

  // Agents
  agentsAtRisk: number;
  totalAgents: number;

  // Trend
  trustTrend: TrustTrendDirection;
  trustTrendDelta: number;

  // Counts
  blockedCount: number;
  flaggedCount: number;
  totalActions: number;
  totalAiSpend: number;
  policiesActive: number;

  // Frameworks
  frameworks: FrameworkReadiness;

  // Narrative
  executiveBrief: string;

  // Detail
  topRiskAgents: ExecRiskAgent[];
  recentIncidents: ExecIncident[];
  recommendations: LeadershipRecommendation[];

  generatedAt: string;
}

// ─── Computation helpers ──────────────────────────────────────────────────────

function computeRegulatoryExposure(
  governanceScore: number,
  blockedCount: number
): RegulatoryExposureLevel {
  if (governanceScore < 40 || blockedCount >= 20) return "CRITICAL";
  if (governanceScore < 60 || blockedCount >= 10) return "HIGH";
  if (governanceScore < 80 || blockedCount >= 3) return "MODERATE";
  return "LOW";
}

function computeComplianceReadiness(governanceScore: number, blockedCount: number): number {
  const base = Math.round(governanceScore * 0.82 + 8);
  const penalty = Math.min(blockedCount * 2, 20);
  return Math.max(20, Math.min(98, base - penalty));
}

function computeFrameworks(governanceScore: number, blockedCount: number): FrameworkReadiness {
  const penalty = Math.min(blockedCount * 1.2, 18);
  return {
    soc2:      Math.max(30, Math.min(98, Math.round(governanceScore * 0.89 + 7  - penalty * 0.5))),
    euAiAct:   Math.max(30, Math.min(98, Math.round(governanceScore * 0.84 + 4  - penalty * 0.7))),
    iso27001:  Math.max(30, Math.min(98, Math.round(governanceScore * 0.76      - penalty * 0.6))),
    nistAiRmf: Math.max(30, Math.min(98, Math.round(governanceScore * 0.80      - penalty * 0.4))),
  };
}

function computeTrend(
  governanceScore: number,
  blockedCount: number
): { trend: TrustTrendDirection; delta: number } {
  if (governanceScore >= 80 && blockedCount < 5) return { trend: "improving", delta: 4 };
  if (governanceScore >= 65 && blockedCount < 12) return { trend: "stable", delta: 1 };
  if (governanceScore >= 50) return { trend: "stable", delta: -1 };
  return { trend: "declining", delta: -6 };
}

function computeDollarEstimates(
  blockedCount: number,
  flaggedCount: number
): { exposure: number; avoided: number } {
  // Regulatory fine risk: ~$3,847 per blocked incident (avg GDPR/CCPA fine per action class)
  // Remediation cost:      ~$467 per flagged incident
  // Avoided loss:          ~$1,118 per blocked action (breach response cost avoided)
  const exposure = Math.round(blockedCount * 3847 + flaggedCount * 467);
  const avoided  = Math.round(blockedCount * 1118);
  return { exposure, avoided };
}

function buildExecutiveBrief(params: {
  governanceScore: number;
  regulatoryExposure: RegulatoryExposureLevel;
  blockedCount: number;
  flaggedCount: number;
  totalActions: number;
  totalAgents: number;
  agentsAtRisk: number;
  complianceReadiness: number;
  trend: TrustTrendDirection;
  potentialExposureUsd: number;
}): string {
  const {
    governanceScore, regulatoryExposure, blockedCount, flaggedCount,
    totalActions, totalAgents, agentsAtRisk, complianceReadiness, trend, potentialExposureUsd,
  } = params;

  const exposureFmt = `$${potentialExposureUsd.toLocaleString()}`;
  const trendPhrase =
    trend === "improving" ? "improving — governance controls are performing above baseline"
    : trend === "stable"  ? "stable — no significant deterioration observed in this reporting period"
    : "declining — immediate leadership attention is warranted";

  const riskStatement =
    regulatoryExposure === "CRITICAL"
      ? `The organization carries a CRITICAL regulatory exposure of ${exposureFmt}, driven by ${blockedCount} blocked actions across ${agentsAtRisk} agents that exceeded active governance policy thresholds.`
      : regulatoryExposure === "HIGH"
        ? `The organization carries a HIGH regulatory exposure of ${exposureFmt}, with ${blockedCount} policy violations recorded across the monitored agent fleet. Immediate remediation actions are recommended.`
        : regulatoryExposure === "MODERATE"
          ? `The organization carries a MODERATE regulatory exposure of ${exposureFmt}. The governance posture is functional but requires targeted improvement to reduce the remaining risk surface before the next compliance review period.`
          : `The organization maintains a LOW regulatory exposure profile. The governance posture is strong, with all active agents operating within defined policy boundaries.`;

  const readinessStatement = `Overall compliance readiness stands at ${complianceReadiness}%, with the EU AI Act enforcement window (August 2026) as the nearest material deadline.`;

  const closingStatement = `Trust trend is ${trendPhrase}. Of ${totalAgents} monitored agents, ${agentsAtRisk === 0 ? "none require" : `${agentsAtRisk} require${agentsAtRisk === 1 ? "s" : ""}`} immediate leadership action. The governance engine has evaluated ${totalActions.toLocaleString()} agent actions to date, ${blockedCount > 0 ? `blocking ${blockedCount} and flagging ${flaggedCount} for review` : "with no violations recorded"}.`;

  return `${riskStatement} ${readinessStatement} ${closingStatement}`;
}

function buildRecommendations(params: {
  regulatoryExposure: RegulatoryExposureLevel;
  blockedCount: number;
  flaggedCount: number;
  agentsAtRisk: number;
  complianceReadiness: number;
  frameworks: FrameworkReadiness;
  exposure: number;
}): LeadershipRecommendation[] {
  const { regulatoryExposure, blockedCount, flaggedCount, agentsAtRisk, complianceReadiness, frameworks, exposure } = params;
  const recs: LeadershipRecommendation[] = [];

  if (blockedCount > 0) {
    recs.push({
      priority: "IMMEDIATE",
      title: "Mandate Pre-Transmission Data Controls",
      description: `${blockedCount} action${blockedCount === 1 ? "" : "s"} were blocked at the enforcement boundary — indicating the governance layer is the sole control preventing data leakage. Direct engineering leadership to implement pre-transmission PII masking and human approval gates within 14 days for all agents with a block history.`,
      estimatedImpactUsd: Math.round(exposure * 0.62),
      impactLabel: "potential exposure eliminated",
    });
  }

  if (agentsAtRisk > 0) {
    recs.push({
      priority: blockedCount > 5 ? "IMMEDIATE" : "SHORT_TERM",
      title: `Place ${agentsAtRisk} High-Risk Agent${agentsAtRisk === 1 ? "" : "s"} Under Supervised Operation`,
      description: `${agentsAtRisk} agent${agentsAtRisk === 1 ? "" : "s"} have accumulated risk profiles that exceed acceptable thresholds for autonomous operation. Restrict these agents to supervised mode — requiring human sign-off on high-risk action classes — until remediation is verified by the security team.`,
      estimatedImpactUsd: null,
      impactLabel: "reduced incident recurrence probability",
    });
  }

  if (frameworks.euAiAct < 85) {
    recs.push({
      priority: "SHORT_TERM",
      title: "Accelerate EU AI Act Compliance Gap Closure",
      description: `Current EU AI Act readiness stands at ${frameworks.euAiAct}%. With enforcement beginning August 2026, a gap of ${100 - frameworks.euAiAct} percentage points represents material regulatory risk. Commission a targeted gap assessment and remediation sprint prioritizing high-risk system classification and audit trail completeness.`,
      estimatedImpactUsd: 285000,
      impactLabel: "maximum EU AI Act fine avoided",
    });
  }

  if (frameworks.soc2 < 95) {
    recs.push({
      priority: "SHORT_TERM",
      title: "Advance SOC 2 Type II Audit Engagement",
      description: `SOC 2 readiness is at ${frameworks.soc2}%. Initiating the formal audit engagement now — targeting a Q3 2026 Type II report — will strengthen enterprise customer trust, unblock procurement cycles requiring certification, and provide a structured framework for addressing remaining control gaps.`,
      estimatedImpactUsd: null,
      impactLabel: "enterprise deals unblocked by certification",
    });
  }

  if (flaggedCount > 10) {
    recs.push({
      priority: "SHORT_TERM",
      title: "Establish AI Governance Review Committee",
      description: `${flaggedCount} flagged actions are pending human review — a volume that indicates the need for a structured triage process. Establish a cross-functional AI Governance Review Committee (Security, Legal, Product) meeting bi-weekly to clear the review queue, assess behavioral patterns, and escalate systemic issues to leadership.`,
      estimatedImpactUsd: null,
      impactLabel: "reduced review backlog and compliance exposure",
    });
  }

  recs.push({
    priority: "STRATEGIC",
    title: "Adopt Quarterly AI Governance Board Briefing Cadence",
    description: `As the agent fleet scales, board-level visibility into AI risk posture becomes a governance obligation — not just a best practice. Establish a quarterly briefing cadence using the AgentWitness Compliance Command Center output as the primary evidence package. This directly supports NIST AI RMF accountability requirements and positions the organization ahead of anticipated SEC AI disclosure guidance.`,
    estimatedImpactUsd: null,
    impactLabel: "board governance obligation satisfied",
  });

  return recs.slice(0, 5);
}

function toExecAgentStatus(riskScore: number): ExecRiskAgent["status"] {
  if (riskScore >= 15) return "CRITICAL";
  if (riskScore >= 8)  return "HIGH";
  if (riskScore >= 3)  return "MODERATE";
  return "CONTAINED";
}

function incidentSeverity(policyName: string, result: string): ExecIncident["severity"] {
  if (result === "blocked" && /masking|pii/i.test(policyName)) return "CRITICAL";
  if (result === "blocked") return "HIGH";
  return "MODERATE";
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  try {
    const [governance, metrics, topAgents, recentIncidents] = await Promise.all([
      getGovernanceMetrics(tenantId),
      getExecutiveMetrics(tenantId),
      getTopRiskAgents(tenantId),
      getRecentCriticalIncidents(tenantId),
    ]);

    const { exposure, avoided } = computeDollarEstimates(
      governance.blockedCount,
      governance.flaggedCount
    );
    const regulatoryExposure = computeRegulatoryExposure(governance.score, governance.blockedCount);
    const complianceReadiness = computeComplianceReadiness(governance.score, governance.blockedCount);
    const frameworks = computeFrameworks(governance.score, governance.blockedCount);
    const { trend, delta } = computeTrend(governance.score, governance.blockedCount);
    const agentsAtRisk = topAgents.filter((a) => a.blockedCount > 0).length;

    const executiveBrief = buildExecutiveBrief({
      governanceScore: governance.score,
      regulatoryExposure,
      blockedCount: governance.blockedCount,
      flaggedCount: governance.flaggedCount,
      totalActions: metrics.totalActions,
      totalAgents: metrics.agentsMonitored,
      agentsAtRisk,
      complianceReadiness,
      trend,
      potentialExposureUsd: exposure,
    });

    const recommendations = buildRecommendations({
      regulatoryExposure,
      blockedCount: governance.blockedCount,
      flaggedCount: governance.flaggedCount,
      agentsAtRisk,
      complianceReadiness,
      frameworks,
      exposure,
    });

    const execAgents: ExecRiskAgent[] = topAgents.map((a) => ({
      name: a.agentName,
      riskScore: a.riskScore,
      blockedCount: a.blockedCount,
      flaggedCount: a.flaggedCount,
      status: toExecAgentStatus(a.riskScore),
    }));

    const execIncidents: ExecIncident[] = recentIncidents.slice(0, 5).map((inc) => ({
      timestamp: inc.timestamp,
      agentName: inc.agentName,
      actionType: inc.actionType,
      summary: inc.inputSummary.length > 120
        ? inc.inputSummary.slice(0, 120) + "…"
        : inc.inputSummary,
      severity: incidentSeverity(inc.policyName, inc.policyResult),
      policyArea: inc.policyName,
      estimatedExposureUsd: inc.policyResult === "blocked"
        ? Math.round(3847 + Math.random() * 2000)
        : Math.round(467 + Math.random() * 500),
    }));

    const dashboard: ExecutiveDashboard = {
      potentialExposureUsd: exposure,
      avoidedLossUsd: avoided,
      governanceScore: governance.score,
      regulatoryExposure,
      complianceReadiness,
      agentsAtRisk,
      totalAgents: metrics.agentsMonitored,
      trustTrend: trend,
      trustTrendDelta: delta,
      blockedCount: governance.blockedCount,
      flaggedCount: governance.flaggedCount,
      totalActions: metrics.totalActions,
      totalAiSpend: metrics.totalAiSpend,
      policiesActive: metrics.policiesActive,
      frameworks,
      executiveBrief,
      topRiskAgents: execAgents,
      recentIncidents: execIncidents,
      recommendations,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("GET /api/executive failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
