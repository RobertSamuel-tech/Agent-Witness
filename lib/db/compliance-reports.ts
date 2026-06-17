import {
  executeSql,
  uuidParam,
  textParam,
  intParam,
  jsonParam,
  getString,
  getNumber,
  getNullableString,
  type DbRecord,
} from "./index";

export interface ComplianceReport {
  id: string;
  tenantId: string;
  generatedAt: string;
  fileName: string;
  fileSizeBytes: number;
  standards: string[];
  totalActions: number;
  blockedCount: number;
  flaggedCount: number;
  governanceScore: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface InsertReportParams {
  tenantId: string;
  fileName: string;
  fileSizeBytes: number;
  standards: string[];
  totalActions: number;
  blockedCount: number;
  flaggedCount: number;
  governanceScore: number;
  periodStart: Date;
  periodEnd: Date;
}

let tableReady = false;

async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await executeSql(`
    CREATE TABLE IF NOT EXISTS compliance_reports (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id        UUID        NOT NULL,
      generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      file_name        TEXT        NOT NULL,
      file_size_bytes  BIGINT      NOT NULL DEFAULT 0,
      standards        JSONB       NOT NULL DEFAULT '[]',
      total_actions    INTEGER     NOT NULL DEFAULT 0,
      blocked_count    INTEGER     NOT NULL DEFAULT 0,
      flagged_count    INTEGER     NOT NULL DEFAULT 0,
      governance_score INTEGER     NOT NULL DEFAULT 0,
      period_start     TIMESTAMPTZ,
      period_end       TIMESTAMPTZ
    )
  `);
  await executeSql(`
    CREATE INDEX IF NOT EXISTS idx_compliance_reports_tenant_at
      ON compliance_reports (tenant_id, generated_at DESC)
  `);
  tableReady = true;
}

function toReport(row: DbRecord): ComplianceReport {
  const raw = row["standards"];
  const standards: string[] = Array.isArray(raw)
    ? (raw as string[])
    : typeof raw === "string"
      ? (JSON.parse(raw) as string[])
      : [];

  return {
    id: getString(row, "id"),
    tenantId: getString(row, "tenant_id"),
    generatedAt: getString(row, "generated_at"),
    fileName: getString(row, "file_name"),
    fileSizeBytes: getNumber(row, "file_size_bytes"),
    standards,
    totalActions: getNumber(row, "total_actions"),
    blockedCount: getNumber(row, "blocked_count"),
    flaggedCount: getNumber(row, "flagged_count"),
    governanceScore: getNumber(row, "governance_score"),
    periodStart: getNullableString(row, "period_start"),
    periodEnd: getNullableString(row, "period_end"),
  };
}

export async function insertComplianceReport(
  params: InsertReportParams
): Promise<ComplianceReport> {
  await ensureTable();

  const rows = await executeSql(
    `INSERT INTO compliance_reports (
       tenant_id, file_name, file_size_bytes, standards,
       total_actions, blocked_count, flagged_count, governance_score,
       period_start, period_end
     ) VALUES (
       :tenantId, :fileName, :fileSizeBytes, :standards,
       :totalActions, :blockedCount, :flaggedCount, :governanceScore,
       :periodStart, :periodEnd
     ) RETURNING *`,
    [
      uuidParam("tenantId", params.tenantId),
      textParam("fileName", params.fileName),
      intParam("fileSizeBytes", params.fileSizeBytes),
      jsonParam("standards", params.standards),
      intParam("totalActions", params.totalActions),
      intParam("blockedCount", params.blockedCount),
      intParam("flaggedCount", params.flaggedCount),
      intParam("governanceScore", params.governanceScore),
      textParam("periodStart", params.periodStart.toISOString()),
      textParam("periodEnd", params.periodEnd.toISOString()),
    ]
  );

  return toReport(rows[0]);
}

export async function listComplianceReports(
  tenantId: string
): Promise<ComplianceReport[]> {
  await ensureTable();

  const rows = await executeSql(
    `SELECT * FROM compliance_reports
     WHERE tenant_id = :tenantId
     ORDER BY generated_at DESC
     LIMIT 20`,
    [uuidParam("tenantId", tenantId)]
  );

  return rows.map(toReport);
}
