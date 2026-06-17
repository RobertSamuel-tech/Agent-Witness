import { NextRequest, NextResponse } from "next/server";
import {
  getGovernanceMetrics,
  getExecutiveMetrics,
  getTopRiskAgents,
  getPolicyRiskBreakdown,
  getRecentCriticalIncidents,
} from "@/lib/db/risk-center";
import { getAgentTrustScores } from "@/lib/db/trust-scores";
import { insertComplianceReport } from "@/lib/db/compliance-reports";
import { generateCompliancePdf } from "@/lib/pdf/compliance-report";
import { executeSql, uuidParam, getString } from "@/lib/db";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getTenantName(tenantId: string): Promise<string> {
  try {
    const rows = await executeSql(
      `SELECT name FROM tenants WHERE id = :tenantId LIMIT 1`,
      [uuidParam("tenantId", tenantId)]
    );
    return rows.length > 0 ? getString(rows[0], "name") : "Unknown Organization";
  } catch {
    return "Unknown Organization";
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json(
      { error: "Missing or invalid x-tenant-id header" },
      { status: 400 }
    );
  }

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 3600 * 1000);
  const generatedAt = new Date();

  const standards = ["SOC 2 Type II", "EU AI Act (Regulation 2024/1689)", "ISO 27001:2022"];

  try {
    // Gather all report data in parallel
    const [
      tenantName,
      governance,
      metrics,
      topRiskAgents,
      policyBreakdown,
      incidents,
      agentTrustScores,
    ] = await Promise.all([
      getTenantName(tenantId),
      getGovernanceMetrics(tenantId),
      getExecutiveMetrics(tenantId),
      getTopRiskAgents(tenantId),
      getPolicyRiskBreakdown(tenantId),
      getRecentCriticalIncidents(tenantId),
      getAgentTrustScores(tenantId),
    ]);

    const reportData = {
      tenantName,
      generatedAt,
      periodStart,
      periodEnd,
      standards,
      governance,
      metrics,
      topRiskAgents,
      policyBreakdown,
      incidents,
      agentTrustScores,
    };

    // Generate PDF
    const pdfBuffer = await generateCompliancePdf(reportData);

    // Store metadata in Aurora
    const ts = generatedAt.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const fileName = `agentwitness-compliance-${ts}.pdf`;

    await insertComplianceReport({
      tenantId,
      fileName,
      fileSizeBytes: pdfBuffer.length,
      standards,
      totalActions: metrics.totalActions,
      blockedCount: governance.blockedCount,
      flaggedCount: governance.flaggedCount,
      governanceScore: governance.score,
      periodStart,
      periodEnd,
    });

    // Slice produces a true ArrayBuffer copy (not SharedArrayBuffer), satisfying BodyInit
    const arrayBuf = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer;
    const body = new Blob([arrayBuf], { type: "application/pdf" });

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("POST /api/compliance/report failed", error);
    return NextResponse.json(
      { error: "Failed to generate compliance report" },
      { status: 500 }
    );
  }
}
