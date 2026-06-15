import { NextRequest, NextResponse } from "next/server";
import {
  getGovernanceMetrics,
  getExecutiveMetrics,
  getTopRiskAgents,
  getPolicyRiskBreakdown,
  getRecentCriticalIncidents,
  getExecutiveSummary,
} from "@/lib/db/risk-center";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  try {
    const [governanceScore, metrics, topRiskAgents, policyBreakdown, incidents, executiveSummary] =
      await Promise.all([
        getGovernanceMetrics(tenantId),
        getExecutiveMetrics(tenantId),
        getTopRiskAgents(tenantId),
        getPolicyRiskBreakdown(tenantId),
        getRecentCriticalIncidents(tenantId),
        getExecutiveSummary(tenantId),
      ]);

    return NextResponse.json({
      governanceScore,
      metrics,
      topRiskAgents,
      policyBreakdown,
      incidents,
      executiveSummary,
    });
  } catch (error) {
    console.error("GET /api/risk-center failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
