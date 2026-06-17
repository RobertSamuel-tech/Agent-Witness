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
  console.log("[COMPLIANCE] Step 1 — request received");
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    console.error("[COMPLIANCE] Step 1 FAIL — missing/invalid x-tenant-id:", tenantId);
    return NextResponse.json(
      { error: "Missing or invalid x-tenant-id header" },
      { status: 400 }
    );
  }
  console.log("[COMPLIANCE] Step 1 OK — tenantId:", tenantId);

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 3600 * 1000);
  const generatedAt = new Date();

  const standards = ["SOC 2 Type II", "EU AI Act (Regulation 2024/1689)", "ISO 27001:2022"];

  try {
    console.log("[COMPLIANCE] Step 2 — fetching DB data (parallel)");

    let tenantName: string, governance: Awaited<ReturnType<typeof getGovernanceMetrics>>,
        metrics: Awaited<ReturnType<typeof getExecutiveMetrics>>,
        topRiskAgents: Awaited<ReturnType<typeof getTopRiskAgents>>,
        policyBreakdown: Awaited<ReturnType<typeof getPolicyRiskBreakdown>>,
        incidents: Awaited<ReturnType<typeof getRecentCriticalIncidents>>,
        agentTrustScores: Awaited<ReturnType<typeof getAgentTrustScores>>;

    try {
      [tenantName, governance, metrics, topRiskAgents, policyBreakdown, incidents, agentTrustScores] =
        await Promise.all([
          getTenantName(tenantId),
          getGovernanceMetrics(tenantId),
          getExecutiveMetrics(tenantId),
          getTopRiskAgents(tenantId),
          getPolicyRiskBreakdown(tenantId),
          getRecentCriticalIncidents(tenantId),
          getAgentTrustScores(tenantId),
        ]);
    } catch (dbError) {
      console.error("[COMPLIANCE] Step 2 FAIL — DB query error:", dbError);
      throw dbError;
    }

    console.log("[COMPLIANCE] Step 2 OK — DB data fetched:", {
      tenantName,
      governanceScore: governance.score,
      totalActions: metrics.totalActions,
      blockedActions: metrics.blockedActions,
      flaggedActions: metrics.flaggedActions,
      policiesActive: metrics.policiesActive,
      agentsMonitored: metrics.agentsMonitored,
      topRiskAgentsCount: topRiskAgents.length,
      policyBreakdownCount: policyBreakdown.length,
      incidentsCount: incidents.length,
      agentTrustScoresCount: agentTrustScores.length,
    });

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

    console.log("[COMPLIANCE] Step 3 — generating PDF");
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateCompliancePdf(reportData);
    } catch (pdfError) {
      console.error("[COMPLIANCE] Step 3 FAIL — PDF generation error:", pdfError);
      throw pdfError;
    }
    console.log("[COMPLIANCE] Step 3 OK — PDF size:", pdfBuffer.length, "bytes");

    // Store metadata in Aurora
    const ts = generatedAt.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const fileName = `agentwitness-compliance-${ts}.pdf`;

    console.log("[COMPLIANCE] Step 4 — inserting compliance_reports record");
    try {
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
    } catch (insertError) {
      console.error("[COMPLIANCE] Step 4 FAIL — insertComplianceReport error:", insertError);
      throw insertError;
    }
    console.log("[COMPLIANCE] Step 4 OK — report record saved, fileName:", fileName);

    console.log("[COMPLIANCE] Step 5 — building response blob");
    // Slice produces a true ArrayBuffer copy (not SharedArrayBuffer), satisfying BodyInit
    const arrayBuf = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer;
    const body = new Blob([arrayBuf], { type: "application/pdf" });

    console.log("[COMPLIANCE] Step 5 OK — returning PDF response");
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
    console.error("[COMPLIANCE] FATAL — POST /api/compliance/report failed:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { error: "Failed to generate compliance report" },
      { status: 500 }
    );
  }
}
