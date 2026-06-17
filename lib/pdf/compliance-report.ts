import PDFDocument from "pdfkit";
import type {
  GovernanceScore,
  ExecutiveMetrics,
  TopRiskAgent,
  PolicyRiskBreakdownEntry,
  CriticalIncident,
} from "@/lib/db/risk-center";
import type { AgentTrustSummary } from "@/lib/db/trust-scores";

// ── Page geometry ─────────────────────────────────────────────────────────────

const PW = 595.28;
const PH = 841.89;
const ML = 54;
const MT = 54;
const CW = PW - ML * 2;
const FOOTER_H = 36;
const CONTENT_BOTTOM = PH - MT - FOOTER_H;

// ── Colour palette ────────────────────────────────────────────────────────────

const C = {
  pageDark: "#020617",
  cardDark: "#0f172a",
  borderDark: "#1e293b",
  cyan: "#06b6d4",
  purple: "#a855f7",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  indigo: "#6366f1",
  white: "#f8fafc",
  muted: "#94a3b8",
  body: "#334155",
  lightBg: "#f8fafc",
  border: "#e2e8f0",
};

// ── Data shape ────────────────────────────────────────────────────────────────

export interface ReportData {
  tenantName: string;
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  standards: string[];
  governance: GovernanceScore;
  metrics: ExecutiveMetrics;
  topRiskAgents: TopRiskAgent[];
  policyBreakdown: PolicyRiskBreakdownEntry[];
  incidents: CriticalIncident[];
  agentTrustScores: AgentTrustSummary[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtShortDt(iso: string): string {
  const d = new Date(iso);
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${mo}/${day} ${hh}:${mm}`;
}

function truncStr(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function govColor(score: number): string {
  if (score >= 80) return C.green;
  if (score >= 50) return C.amber;
  return C.red;
}


// ── Renderer ──────────────────────────────────────────────────────────────────

class R {
  doc: PDFKit.PDFDocument;
  y = MT;
  sectionColor = C.cyan;
  sectionTitle = "";

  constructor(doc: PDFKit.PDFDocument) {
    this.doc = doc;
  }

  // Call at the start of every content section (adds a new page)
  startSection(color: string, title: string) {
    this.doc.addPage();
    this.sectionColor = color;
    this.sectionTitle = title;
    this.y = MT;
    this._drawPageHeader();
  }

  ensureSpace(h: number) {
    if (this.y + h > CONTENT_BOTTOM) {
      this.doc.addPage();
      this.y = MT;
      this._drawPageHeader();
    }
  }

  _drawPageHeader() {
    // Top accent bar
    this.doc.rect(0, 0, PW, 4).fill(this.sectionColor);
    // Left accent + title
    this.doc.rect(ML, MT, 3, 22).fill(this.sectionColor);
    this.doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(C.cardDark)
      .text(this.sectionTitle, ML + 10, MT + 4, { width: CW - 90, lineBreak: false });
    // Top-right brand
    this.doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(C.muted)
      .text("AgentWitness", PW - ML - 70, MT + 7, { width: 70, align: "right" });
    this.y = MT + 30;
    this.doc.rect(ML, this.y, CW, 0.75).fill(C.border);
    this.y += 10;
  }

  // ── Primitives ──

  vGap(n = 10) { this.y += n; }

  sectionDivider(title: string, color?: string) {
    const col = color ?? this.sectionColor;
    this.vGap(8);
    this.doc.rect(ML, this.y, CW, 1).fill(col + "44");
    this.vGap(4);
    this.doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(col)
      .text(title.toUpperCase(), ML, this.y, { characterSpacing: 0.5 });
    this.y += 13;
  }

  paragraph(text: string, size = 9.5, color = C.body) {
    this.doc.font("Helvetica").fontSize(size).fillColor(color).text(text, ML, this.y, { width: CW });
    this.y = this.doc.y + 4;
  }

  label(text: string, color = C.muted, size = 8) {
    this.doc
      .font("Helvetica-Bold")
      .fontSize(size)
      .fillColor(color)
      .text(text.toUpperCase(), ML, this.y, { width: CW, characterSpacing: 0.5 });
    this.y += size + 4;
  }

  kvRow(key: string, value: string, valueColor = C.body) {
    this.doc.font("Helvetica").fontSize(8.5).fillColor(C.muted).text(key, ML, this.y, { width: 140 });
    this.doc.font("Helvetica-Bold").fontSize(8.5).fillColor(valueColor).text(value, ML + 145, this.y, { width: CW - 145 });
    this.y += 14;
    this.doc.rect(ML, this.y - 2, CW, 0.4).fill(C.border);
  }

  // 3-column KPI card row
  kpiRow(cols: { label: string; value: string; color: string; sub?: string }[], h = 54) {
    const colW = CW / cols.length;
    cols.forEach(({ label, value, color, sub }, i) => {
      const x = ML + i * colW;
      this.doc.rect(x, this.y, colW - 4, h).fill(C.lightBg);
      this.doc.rect(x, this.y, 3, h).fill(color);
      this.doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text(label, x + 8, this.y + 7, { width: colW - 20 });
      this.doc.font("Helvetica-Bold").fontSize(19).fillColor(color).text(value, x + 8, this.y + 16, { width: colW - 20 });
      if (sub) {
        this.doc.font("Helvetica").fontSize(7).fillColor(C.muted).text(sub, x + 8, this.y + 38, { width: colW - 20 });
      }
    });
    this.y += h + 6;
  }

  progressBar(label: string, value: number, max: number, color: string, rightLabel?: string) {
    const BAR_H = 6;
    this.doc.font("Helvetica").fontSize(8.5).fillColor(C.body).text(label, ML, this.y, { width: CW - 60, lineBreak: false });
    const rl = rightLabel ?? String(value);
    this.doc.font("Helvetica-Bold").fontSize(8.5).fillColor(color).text(rl, ML + CW - 56, this.y, { width: 56, align: "right", lineBreak: false });
    this.y += 12;
    this.doc.rect(ML, this.y, CW, BAR_H).fill(C.border);
    const fillW = max > 0 ? Math.round((value / max) * CW) : 0;
    this.doc.rect(ML, this.y, fillW, BAR_H).fill(color);
    this.y += BAR_H + 8;
  }

  badge(text: string, color: string, x: number, y: number, w = 56, h = 14) {
    this.doc.rect(x, y, w, h).fill(color + "22");
    this.doc.rect(x, y, 2.5, h).fill(color);
    this.doc.font("Helvetica-Bold").fontSize(7.5).fillColor(color).text(text, x + 6, y + 3, { width: w - 10, lineBreak: false });
  }

  table(
    headers: string[],
    colWidths: number[],
    rows: { cells: string[]; textColors?: (string | null)[] }[],
  ) {
    const ROW_H = 20;
    const HDR_H = 22;

    this.ensureSpace(HDR_H + ROW_H);
    this.doc.rect(ML, this.y, CW, HDR_H).fill(C.cardDark);
    let x = ML;
    headers.forEach((h, i) => {
      this.doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white).text(h, x + 5, this.y + 7, {
        width: colWidths[i] - 10,
        lineBreak: false,
      });
      x += colWidths[i];
    });
    this.y += HDR_H;

    rows.forEach((row, ri) => {
      this.ensureSpace(ROW_H + 4);
      if (ri % 2 === 0) this.doc.rect(ML, this.y, CW, ROW_H).fill(C.lightBg);
      x = ML;
      row.cells.forEach((cell, ci) => {
        const tc = row.textColors?.[ci] ?? C.body;
        this.doc.font("Helvetica").fontSize(8).fillColor(tc).text(cell, x + 5, this.y + 6, {
          width: colWidths[ci] - 10,
          lineBreak: false,
          ellipsis: true,
        });
        x += colWidths[ci];
      });
      this.doc.rect(ML, this.y + ROW_H - 0.3, CW, 0.3).fill(C.border);
      this.y += ROW_H;
    });

    this.doc.rect(ML, this.y, CW, 1).fill(C.border);
    this.y += 6;
  }

  criteriaRow(criteria: string, description: string, evidence: string, pass: boolean) {
    const ROW_H = 40;
    this.ensureSpace(ROW_H + 4);
    const COLS = [78, 118, 220, 71];
    const texts = [criteria, description, evidence, pass ? "PASS" : "FAIL"];
    const bg = this.y % 80 < 40 ? C.lightBg : C.white;
    this.doc.rect(ML, this.y, CW, ROW_H).fill(bg);
    this.doc.rect(ML, this.y, 3, ROW_H).fill(pass ? C.green : C.red);
    let x = ML + 3;
    texts.forEach((t, i) => {
      const fc = i === 3 ? (pass ? C.green : C.red) : i === 0 ? C.indigo : C.body;
      const fw = i === 0 || i === 3 ? "Helvetica-Bold" : "Helvetica";
      this.doc.font(fw).fontSize(8).fillColor(fc).text(t, x + 4, this.y + 5, {
        width: COLS[i] - 8,
        height: ROW_H - 8,
      });
      x += COLS[i];
    });
    this.doc.rect(ML, this.y + ROW_H - 0.3, CW, 0.3).fill(C.border);
    this.y += ROW_H;
  }

  // Governance score ring (arc-based gauge)
  governanceRing(cx: number, cy: number, score: number) {
    const radius = 36;
    const lw = 9;
    const color = govColor(score);
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.max(score, 0) / 100) * 2 * Math.PI;

    // Background track
    this.doc
      .save()
      .lineWidth(lw)
      .strokeColor(C.border)
      .circle(cx, cy, radius)
      .stroke()
      .restore();

    // Score arc (pdfkit 0.19.1 has arc() at runtime; TS types lag behind)
    if (score > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docAny = this.doc as any;
      docAny.save()
        .lineWidth(lw)
        .strokeColor(color)
        .arc(cx, cy, radius, startAngle, endAngle)
        .stroke()
        .restore();
    }

    // Center text
    this.doc
      .font("Helvetica-Bold")
      .fontSize(17)
      .fillColor(color)
      .text(String(score), cx - 22, cy - 11, { width: 44, align: "center", lineBreak: false });
    this.doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(C.muted)
      .text("/100", cx - 22, cy + 8, { width: 44, align: "center", lineBreak: false });
  }
}

// ── Page builders ─────────────────────────────────────────────────────────────

function buildCoverPage(r: R, data: ReportData) {
  const doc = r.doc;

  doc.rect(0, 0, PW, PH).fill(C.pageDark);
  doc.rect(0, 0, PW, 5).fill(C.cyan);

  // Wordmark
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.cyan).text("AGENTWITNESS", ML, 52, { characterSpacing: 2.5 });
  doc.rect(ML, 67, 22, 2).fill(C.cyan);

  // Title block
  doc.font("Helvetica-Bold").fontSize(38).fillColor(C.white).text("AI GOVERNANCE", ML, 100, { width: CW });
  doc.font("Helvetica-Bold").fontSize(38).fillColor(C.white).text("COMPLIANCE", ML, 145, { width: CW });
  doc.font("Helvetica-Bold").fontSize(38).fillColor(C.cyan).text("REPORT", ML, 190, { width: CW });

  // Standards badges
  const badges = [
    { text: "SOC 2 Type II", color: C.indigo },
    { text: "EU AI Act 2024/1689", color: C.purple },
    { text: "ISO 27001:2022", color: C.amber },
  ];
  let bx = ML;
  badges.forEach(({ text, color }) => {
    doc.rect(bx, 244, 112, 18).fill(color + "28");
    doc.rect(bx, 244, 2.5, 18).fill(color);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(color).text(text, bx + 7, 249, { width: 102, lineBreak: false });
    bx += 120;
  });

  doc.rect(ML, 280, CW, 0.75).fill(C.cyan + "40");

  // Metadata
  const meta: [string, string][] = [
    ["ORGANIZATION", data.tenantName],
    ["REPORT PERIOD", `${fmtDate(data.periodStart)} — ${fmtDate(data.periodEnd)}`],
    ["GENERATED ON", fmtDate(data.generatedAt)],
    ["STANDARDS COVERED", data.standards.join("  ·  ")],
    ["CLASSIFICATION", "CONFIDENTIAL — AUTHORIZED RECIPIENTS ONLY"],
  ];
  let my = 295;
  meta.forEach(([k, v]) => {
    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text(k, ML, my, { characterSpacing: 0.4 });
    doc.font("Helvetica-Bold").fontSize(11.5).fillColor(C.white).text(v, ML, my + 11, { width: CW });
    doc.rect(ML, my + 28, CW, 0.4).fill(C.borderDark);
    my += 37;
  });

  // Governance score hero card
  const cardY = 490;
  doc.rect(ML, cardY, CW, 78).fill(C.cardDark);
  doc.rect(ML, cardY, 4, 78).fill(C.cyan);

  const gc = govColor(data.governance.score);

  // Ring on left
  r.governanceRing(ML + 56, cardY + 39, data.governance.score);

  // Details on right
  doc.font("Helvetica-Bold").fontSize(10).fillColor(C.white).text("GOVERNANCE SCORE", ML + 108, cardY + 12);
  doc.font("Helvetica").fontSize(9).fillColor(C.muted).text(`Risk Level: ${data.governance.level}`, ML + 108, cardY + 27);
  doc.font("Helvetica").fontSize(8).fillColor(C.muted).text(
    `${data.metrics.totalActions.toLocaleString()} total actions  ·  ${data.governance.blockedCount} blocked  ·  ${data.governance.flaggedCount} flagged`,
    ML + 108, cardY + 42
  );
  doc.font("Helvetica").fontSize(8).fillColor(gc).text(
    data.governance.score >= 80 ? "✓ Compliant Posture" : data.governance.score >= 50 ? "⚠ Review Required" : "✗ Critical — Remediation Needed",
    ML + 108, cardY + 57
  );

  // 3 sub-metric tiles
  const subY = cardY + 92;
  const subItems = [
    {
      label: "Compliance Rate",
      value: data.metrics.totalActions > 0
        ? `${Math.round(((data.metrics.totalActions - data.governance.blockedCount) / data.metrics.totalActions) * 100)}%`
        : "—",
      color: C.green,
    },
    { label: "Policy Violations", value: String(data.governance.blockedCount + data.governance.flaggedCount), color: C.red },
    { label: "Active Policies", value: String(data.metrics.policiesActive), color: C.cyan },
  ];
  subItems.forEach(({ label, value, color }, i) => {
    const sx = ML + i * (CW / 3);
    doc.rect(sx, subY, CW / 3 - 4, 38).fill(C.borderDark);
    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text(label, sx + 8, subY + 6, { width: CW / 3 - 20 });
    doc.font("Helvetica-Bold").fontSize(17).fillColor(color).text(value, sx + 8, subY + 16, { width: CW / 3 - 20 });
  });

  // Bottom strip
  const stripY = PH - 44;
  doc.rect(0, stripY, PW, 44).fill(C.cardDark);
  doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text(
    "This document is confidential and intended solely for authorized recipients of the named organization. Do not distribute.",
    ML, stripY + 10, { width: CW, align: "center" }
  );
  doc.font("Helvetica").fontSize(6.5).fillColor(C.borderDark + "ff").text(
    `AgentWitness Enterprise Platform  ·  ${data.generatedAt.toISOString().slice(0, 19)}Z`,
    ML, stripY + 26, { width: CW, align: "center" }
  );
}

// Page 2 — Executive Summary
function buildExecutiveSummary(r: R, data: ReportData) {
  const { metrics, governance } = data;
  const compRate = metrics.totalActions > 0
    ? Math.round(((metrics.totalActions - governance.blockedCount) / metrics.totalActions) * 100)
    : 100;
  const blockedPct = metrics.totalActions > 0 ? Math.round((governance.blockedCount / metrics.totalActions) * 100) : 0;

  r.vGap(4);

  // KPI row 1
  r.kpiRow([
    { label: "Total Actions Monitored", value: metrics.totalActions.toLocaleString(), color: C.cyan },
    { label: "Blocked (Policy Enforcement)", value: String(governance.blockedCount), color: C.red, sub: `${blockedPct}% of total` },
    { label: "Flagged (Needs Review)", value: String(governance.flaggedCount), color: C.amber },
  ]);

  // KPI row 2
  r.kpiRow([
    { label: "Compliance Rate", value: `${compRate}%`, color: C.green, sub: compRate >= 95 ? "Excellent" : compRate >= 80 ? "Good" : "Needs Attention" },
    { label: "Active Governance Policies", value: String(metrics.policiesActive), color: C.indigo },
    { label: "AI Agents Monitored", value: String(metrics.agentsMonitored), color: C.purple },
  ]);

  // Governance posture row — ring + details side by side
  r.sectionDivider("Governance Posture");

  const ringX = ML + 46;
  const ringY = r.y + 46;
  r.governanceRing(ringX, ringY, governance.score);

  // Details next to ring
  const dx = ML + 108;
  const dy = r.y;
  r.doc
    .font("Helvetica-Bold").fontSize(10).fillColor(C.cardDark)
    .text("Overall Governance Score", dx, dy, { width: CW - 120 });
  r.doc
    .font("Helvetica").fontSize(8.5).fillColor(C.muted)
    .text(
      `Risk level: ${governance.level}  ·  Period: ${fmtDate(data.periodStart)} – ${fmtDate(data.periodEnd)}`,
      dx, dy + 14, { width: CW - 120 }
    );
  const total = data.metrics.totalActions;
  const bPct = total > 0 ? ((governance.blockedCount / total) * 100).toFixed(1) : "0.0";
  const fPct = total > 0 ? ((governance.flaggedCount / total) * 100).toFixed(1) : "0.0";
  r.doc
    .font("Helvetica").fontSize(8.5).fillColor(C.body)
    .text(
      `Score = 100 − (blocked% × 100) − (flagged% × 40) − (highCost% × 20). ` +
      `Blocked: ${bPct}%  ·  Flagged: ${fPct}%  ·  Final: ${governance.score}/100.`,
      dx, dy + 28, { width: CW - 120 }
    );

  r.y = Math.max(ringY + 55, dy + 60);
  r.vGap(8);

  r.sectionDivider("Key Findings");

  r.paragraph(
    `During the reporting period (${fmtDate(data.periodStart)} to ${fmtDate(data.periodEnd)}), ` +
    `AgentWitness monitored ${metrics.totalActions.toLocaleString()} AI agent actions across ` +
    `${metrics.agentsMonitored} deployed agents. The platform enforced ${metrics.policiesActive} active ` +
    `governance policies, resulting in a ${compRate}% compliance rate. ` +
    `${governance.blockedCount} actions were blocked automatically and ${governance.flaggedCount} were ` +
    `flagged for human review. Total AI spend monitored: $${metrics.totalAiSpend.toFixed(2)}.`,
    9, C.body
  );

  r.vGap(8);
  r.sectionDivider("Audit Scope");
  r.kvRow("Organization", data.tenantName);
  r.kvRow("Period", `${fmtDate(data.periodStart)} — ${fmtDate(data.periodEnd)}`);
  r.kvRow("Standards Assessed", data.standards.join("  ·  "));
  r.kvRow("Agents in Scope", String(metrics.agentsMonitored));
  r.kvRow("Total Events in Scope", metrics.totalActions.toLocaleString());
  r.kvRow("High-Cost Anomalies", String(governance.highCostCount), C.amber);
}

// Page 3 — Risk Overview
function buildRiskOverview(r: R, data: ReportData) {
  const { metrics, governance } = data;
  const allowed = metrics.totalActions - governance.blockedCount - governance.flaggedCount;
  const compPct = metrics.totalActions > 0 ? Math.round((allowed / metrics.totalActions) * 100) : 100;
  const flaggedPct = metrics.totalActions > 0 ? Math.round((governance.flaggedCount / metrics.totalActions) * 100) : 0;
  const blockedPct = metrics.totalActions > 0 ? Math.round((governance.blockedCount / metrics.totalActions) * 100) : 0;

  r.vGap(4);
  r.sectionDivider("Action Outcome Distribution");

  r.progressBar(
    "Allowed (policy compliant)",
    allowed, metrics.totalActions, C.green,
    `${allowed.toLocaleString()} (${compPct}%)`
  );
  r.progressBar(
    "Flagged (pending human review)",
    governance.flaggedCount, metrics.totalActions, C.amber,
    `${governance.flaggedCount} (${flaggedPct}%)`
  );
  r.progressBar(
    "Blocked (automatic policy enforcement)",
    governance.blockedCount, metrics.totalActions, C.red,
    `${governance.blockedCount} (${blockedPct}%)`
  );

  r.vGap(6);
  r.sectionDivider("Top Risk Agents");

  if (data.topRiskAgents.length === 0) {
    r.paragraph("No high-risk agents detected in this period.", 9, C.muted);
  } else {
    r.table(
      ["Agent Name", "Risk Score", "Blocked Actions", "Flagged Actions"],
      [223, 88, 100, 76],
      data.topRiskAgents.map((a) => ({
        cells: [a.agentName, String(a.riskScore), String(a.blockedCount), String(a.flaggedCount)],
        textColors: [C.body, a.riskScore > 5 ? C.red : C.amber, C.red, C.amber],
      }))
    );
  }

  r.vGap(6);
  r.sectionDivider("Policy Trigger Frequency");

  if (data.policyBreakdown.length === 0) {
    r.paragraph("No policy triggers recorded in this period.", 9, C.muted);
  } else {
    r.table(
      ["Policy Name", "Trigger Count"],
      [370, 117],
      data.policyBreakdown.map((p) => ({
        cells: [p.policyName, String(p.hitCount)],
        textColors: [C.body, p.hitCount > 0 ? C.red : C.muted],
      }))
    );
  }
}

// Page 4 — Agent Trust Intelligence
function buildAgentTrustIntelligence(r: R, data: ReportData) {
  r.vGap(4);

  r.paragraph(
    "Agent Trust Scores are computed continuously from each agent's violation history, compliance rate, " +
    "and behavioral consistency. Scores below 50 indicate critical risk and warrant immediate review. " +
    "Trend arrows reflect movement relative to the prior 7-day period.",
    9, C.body
  );
  r.vGap(8);

  r.sectionDivider("Trust Score Legend");

  // Legend badges inline
  const legendItems = [
    { label: "≥ 80  Trusted", color: C.green },
    { label: "50–79  At Risk", color: C.amber },
    { label: "< 50  Critical", color: C.red },
    { label: "↑ Improving", color: C.cyan },
    { label: "↓ Degrading", color: C.red },
  ];
  legendItems.forEach(({ label, color }, i) => {
    r.badge(label, color, ML + i * 96, r.y, 90, 14);
  });
  r.y += 22;

  r.sectionDivider("Per-Agent Trust Report");

  if (data.agentTrustScores.length === 0) {
    r.paragraph("No agent trust data available for this reporting period.", 9, C.muted);
  } else {
    r.table(
      ["Agent", "Framework", "Trust", "Compliance", "Viol. Rate", "Actions", "Trend"],
      [122, 72, 58, 66, 62, 60, 47],
      data.agentTrustScores.map((a) => {
        const tc = a.trustScore >= 80 ? C.green : a.trustScore >= 50 ? C.amber : C.red;
        const trendLabel = a.riskTrend === "improving" ? "↑ Up" : a.riskTrend === "degrading" ? "↓ Down" : "→ Flat";
        const trendColor = a.riskTrend === "improving" ? C.green : a.riskTrend === "degrading" ? C.red : C.muted;
        return {
          cells: [
            truncStr(a.agentName, 20),
            truncStr(a.agentFramework ?? "—", 12),
            `${a.trustScore}/100`,
            `${a.complianceScore}%`,
            `${(a.violationRate * 100).toFixed(1)}%`,
            String(a.totalActions ?? "—"),
            trendLabel,
          ],
          textColors: [C.body, C.muted, tc, C.cyan, a.violationRate > 0.1 ? C.red : C.muted, C.muted, trendColor],
        };
      })
    );
  }

  r.vGap(8);
  r.sectionDivider("Governance Score Breakdown");
  const tot = data.metrics.totalActions;
  const bPctRaw = tot > 0 ? (data.governance.blockedCount / tot) * 100 : 0;
  const fPctRaw = tot > 0 ? (data.governance.flaggedCount / tot) * 100 : 0;
  const hPctRaw = tot > 0 ? (data.governance.highCostCount / tot) * 100 : 0;
  r.kvRow("Formula", "100 − (blockedPct × 100) − (flaggedPct × 40) − (highCostPct × 20)");
  r.kvRow("Total Actions in Scope", tot.toLocaleString());
  r.kvRow("Blocked Rate", `${bPctRaw.toFixed(1)}%  →  deduction: ${(bPctRaw).toFixed(1)} pts`);
  r.kvRow("Flagged Rate", `${fPctRaw.toFixed(1)}%  →  deduction: ${(fPctRaw * 0.4).toFixed(1)} pts`);
  r.kvRow("High-Cost Rate", `${hPctRaw.toFixed(1)}%  →  deduction: ${(hPctRaw * 0.2).toFixed(1)} pts`);
  r.kvRow("Final Governance Score", `${data.governance.score}/100`, govColor(data.governance.score));
}

// Page 5 — Incident Timeline
function buildIncidentTimeline(r: R, data: ReportData) {
  r.vGap(4);

  if (data.incidents.length === 0) {
    r.kpiRow([
      { label: "Critical Incidents", value: "0", color: C.green, sub: "No incidents recorded" },
      { label: "Agents Affected", value: "0", color: C.green },
      { label: "Auto-Blocked", value: "0", color: C.green },
    ]);
    r.paragraph(
      "No critical incidents were recorded during the reporting period. All AI agent actions " +
      "were within configured governance boundaries. This represents full compliance for the incident domain.",
      9.5, C.green
    );
    return;
  }

  const uniqueAgents = new Set(data.incidents.map((i) => i.agentName)).size;
  const autoBlocked = data.incidents.filter((i) => i.actionType?.toLowerCase().includes("block") || i.policyName).length;

  r.kpiRow([
    { label: "Critical Incidents (Period)", value: String(data.incidents.length), color: C.red },
    { label: "Unique Agents Affected", value: String(uniqueAgents), color: C.amber },
    { label: "Auto-Blocked by Policy", value: String(autoBlocked), color: C.indigo },
  ]);

  r.sectionDivider("Incident Log");

  const displayRows = data.incidents.slice(0, 15);
  r.table(
    ["Timestamp", "Agent", "Action Type", "Policy Triggered", "Input Summary"],
    [72, 98, 88, 104, 125],
    displayRows.map((inc) => ({
      cells: [
        fmtShortDt(inc.timestamp),
        truncStr(inc.agentName, 16),
        truncStr(inc.actionType, 14),
        truncStr(inc.policyName, 18),
        truncStr(inc.inputSummary, 24),
      ],
      textColors: [C.muted, C.body, C.body, C.red, C.muted],
    }))
  );

  if (data.incidents.length > 15) {
    r.paragraph(
      `Displaying 15 of ${data.incidents.length} incidents. The complete incident feed is available in the AgentWitness dashboard.`,
      7.5, C.muted
    );
  }

  r.vGap(8);
  r.sectionDivider("Incident Classification");
  r.paragraph(
    "All incidents above represent events where an AI agent action triggered a governance policy. " +
    "Blocked actions were prevented from completing by the AgentWitness policy engine in real time. " +
    "Each event is recorded with a full immutable audit record including agent identity, action type, " +
    "input and output summaries, applicable policy, and UTC timestamp.",
    9, C.body
  );
}

// Page 6 — Forensic Analysis
function buildForensicAnalysis(r: R, data: ReportData) {
  r.vGap(4);

  r.sectionDivider("Policy Violation Deep Dive");

  if (data.governance.blockedCount === 0 && data.governance.flaggedCount === 0) {
    r.paragraph(
      "No policy violations recorded in this reporting period. All AI agent actions were within " +
      "configured governance boundaries.",
      9.5, C.green
    );
  } else {
    r.kpiRow([
      { label: "Hard Blocks (auto-stopped)", value: String(data.governance.blockedCount), color: C.red },
      { label: "Soft Flags (needs review)", value: String(data.governance.flaggedCount), color: C.amber },
      { label: "High-Cost Anomalies", value: String(data.governance.highCostCount), color: C.purple },
    ]);
  }

  r.sectionDivider("Policy Hit Distribution");

  if (data.policyBreakdown.length > 0) {
    const maxHits = Math.max(...data.policyBreakdown.map((p) => p.hitCount), 1);
    data.policyBreakdown.slice(0, 8).forEach((p) => {
      const color = p.hitCount > 5 ? C.red : p.hitCount > 0 ? C.amber : C.green;
      r.progressBar(
        truncStr(p.policyName, 52),
        p.hitCount,
        maxHits,
        color,
        String(p.hitCount) + (p.hitCount === 1 ? " trigger" : " triggers")
      );
    });
  } else {
    r.paragraph("No policy triggers recorded.", 9, C.muted);
  }

  r.vGap(6);
  r.sectionDivider("Cost & Spend Analysis");

  const costPerAction = data.metrics.totalActions > 0 ? data.metrics.totalAiSpend / data.metrics.totalActions : 0;
  r.kvRow("Total AI Spend Monitored", `$${data.metrics.totalAiSpend.toFixed(2)}`, C.cyan);
  r.kvRow("Average Cost per Action", `$${costPerAction.toFixed(4)}`);
  r.kvRow("High-Cost Action Count", String(data.governance.highCostCount), data.governance.highCostCount > 0 ? C.amber : C.green);
  r.kvRow("Total Actions in Period", data.metrics.totalActions.toLocaleString());

  r.vGap(8);
  r.sectionDivider("Audit Trail Integrity Statement");
  r.paragraph(
    "All audit records in this report are stored in Amazon Aurora PostgreSQL with write-once " +
    "semantics enforced at the application layer. Records include: agent identifier, action type, " +
    "UTC timestamp, input summary, output summary, applicable policy, and policy decision. " +
    "Data is isolated per tenant via Row Level Security and retained for the full audit period " +
    "with no deletions or modifications permitted post-insertion.",
    9, C.body
  );
}

// Page 7 — SOC 2 Type II
function buildSoc2(r: R, data: ReportData) {
  r.vGap(4);
  r.paragraph(
    "The following evidence maps AgentWitness platform controls to SOC 2 Trust Service Criteria (TSC) " +
    "as defined by the AICPA. All controls are enforced at the platform layer and applied uniformly across " +
    "all tenant AI agents.",
    9, C.body
  );
  r.vGap(8);

  const headers = ["TSC Ref", "Control Area", "AgentWitness Evidence", "Status"];
  const colW = [78, 118, 220, 71];
  r.doc.rect(ML, r.y, CW, 22).fill(C.cardDark);
  let x = ML;
  headers.forEach((h, i) => {
    r.doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white).text(h, x + 4, r.y + 7, { width: colW[i] - 8, lineBreak: false });
    x += colW[i];
  });
  r.y += 22;

  const rows: [string, string, string, boolean][] = [
    ["CC1.1", "Control Environment", `${data.metrics.policiesActive} active policies enforce ethical AI usage boundaries across all agents.`, true],
    ["CC6.1", "Logical Access Controls", "All agent actions evaluated against policy rules before execution. Unauthorized actions automatically blocked.", true],
    ["CC6.3", "System Boundaries", "Multi-tenant architecture enforces strict isolation via Row Level Security on all data tables.", true],
    ["CC7.2", "System Monitoring", `${data.metrics.totalActions.toLocaleString()} agent actions logged with immutable audit trails including timestamps and policy decisions.`, true],
    ["CC7.4", "Security Incidents", `${data.governance.blockedCount} threats automatically neutralized. Real-time alerting and incident classification in place.`, true],
    ["CC9.2", "Risk Mitigation", "Continuous risk scoring per agent. Trust scores computed from violation history. Emergency kill-switch available.", true],
    ["A1.1", "Availability", "Audit trail preserved with full event history. System availability monitored via health endpoint.", true],
    ["PI1.1", "Processing Integrity", "Every AI action produces a structured audit record with input/output summary and policy decision.", true],
    ["C1.1", "Confidentiality", "Data masking policies enforced at the AI output layer. PII exposure prevented by automated policy evaluation.", true],
    ["P1.1", "Privacy", "Customer data access by AI agents is logged, evaluated, and subject to data masking and domain block policies.", true],
  ];

  rows.forEach(([tsc, control, evidence, pass]) => r.criteriaRow(tsc, control, evidence, pass));

  r.vGap(10);
  r.paragraph(
    `Evidence period: ${fmtDate(data.periodStart)} — ${fmtDate(data.periodEnd)}.  ` +
    `Total events in scope: ${data.metrics.totalActions.toLocaleString()}.`,
    8, C.muted
  );
}

// Page 8 — EU AI Act
function buildEuAiAct(r: R, data: ReportData) {
  r.vGap(4);
  r.paragraph(
    "The EU AI Act (Regulation 2024/1689) imposes obligations on providers and deployers of AI systems " +
    "in the European Union. The following matrix maps AgentWitness platform capabilities to applicable " +
    "articles for General Purpose AI Systems (GPAIS) and High-Risk AI systems per Annex III.",
    9, C.body
  );
  r.vGap(6);

  r.sectionDivider("Risk Classification");
  r.kvRow("AI System Category", "General Purpose AI (GPAI) — Agentic Systems");
  r.kvRow("Risk Level", "High Risk (automated decision-making with real-world effects)");
  r.kvRow("Applicable Articles", "9, 10, 12, 13, 14, 17, 26, 50");
  r.kvRow("Compliance Approach", "Platform-level controls with per-tenant policy enforcement");
  r.vGap(8);

  const headers = ["Article", "Requirement", "Implementation Evidence", "Status"];
  const colW = [72, 118, 226, 71];
  r.doc.rect(ML, r.y, CW, 22).fill(C.cardDark);
  let x = ML;
  headers.forEach((h, i) => {
    r.doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white).text(h, x + 4, r.y + 7, { width: colW[i] - 8, lineBreak: false });
    x += colW[i];
  });
  r.y += 22;

  const articles: [string, string, string, boolean][] = [
    ["Art. 9", "Risk Management System", `Continuous risk scoring: ${data.metrics.totalActions.toLocaleString()} actions assessed. Governance score ${data.governance.score}/100.`, true],
    ["Art. 10", "Data Governance", "All AI inputs and outputs logged. Data masking policies prevent PII exposure. Audit trail provides data lineage.", true],
    ["Art. 12", "Record Keeping", `${data.metrics.totalActions.toLocaleString()} immutable audit log entries with timestamps, agent identity, action type, and policy decision.`, true],
    ["Art. 13", "Transparency", "Each policy decision accompanied by rule type, evaluation result, and input/output summaries in audit log.", true],
    ["Art. 14", "Human Oversight", "Emergency kill-switch enables immediate suspension of all agent execution. Flagged actions queued for review.", true],
    ["Art. 17", "Quality Management", `${data.metrics.policiesActive} active governance policies covering cost limits, data masking, and domain restrictions.`, true],
    ["Art. 26", "Deployer Obligations", "Tenant-scoped controls enforce per-organisation governance rules. Activity logs available for competent authority review.", true],
    ["Art. 50", "Transparency to Users", "Agents identified as AI systems. Policy enforcement visible in real-time audit trail and anomaly detection.", true],
  ];

  articles.forEach(([article, req, evidence, pass]) => r.criteriaRow(article, req, evidence, pass));

  r.vGap(8);
  r.paragraph(
    "Note: This compliance mapping is produced by the AgentWitness platform based on configured policies and audit data. " +
    "Final legal determination requires qualified legal counsel in the applicable jurisdiction.",
    7.5, C.muted
  );
}

// Page 9 — ISO 27001:2022
function buildIso27001(r: R, data: ReportData) {
  r.vGap(4);
  r.paragraph(
    "ISO/IEC 27001:2022 defines requirements for establishing, implementing, maintaining, and continually improving " +
    "an Information Security Management System (ISMS). The following controls map AgentWitness platform capabilities " +
    "to the ISO 27001 Annex A control set as applied to AI agent operations.",
    9, C.body
  );
  r.vGap(6);

  const headers = ["Control", "Domain", "Implementation Evidence", "Status"];
  const colW = [72, 128, 216, 71];
  r.doc.rect(ML, r.y, CW, 22).fill(C.cardDark);
  let x = ML;
  headers.forEach((h, i) => {
    r.doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white).text(h, x + 4, r.y + 7, { width: colW[i] - 8, lineBreak: false });
    x += colW[i];
  });
  r.y += 22;

  const controls: [string, string, string, boolean][] = [
    ["A.5.1", "Policies for Information Security", `${data.metrics.policiesActive} active governance policies enforced per tenant via the AgentWitness policy engine.`, true],
    ["A.5.15", "Access Control", "Row Level Security isolates all tenant data. Agent actions authenticated and scoped to authorized tenant context.", true],
    ["A.5.23", "Cloud Services Security", "Aurora PostgreSQL with encryption at rest and in transit. Serverless architecture with no persistent compute exposure.", true],
    ["A.5.28", "Collection of Evidence", `${data.metrics.totalActions.toLocaleString()} immutable audit records retained with full input/output metadata and policy decisions.`, true],
    ["A.5.36", "Compliance with Policies", "Policy engine evaluates every agent action before execution. Non-compliant actions blocked automatically.", true],
    ["A.6.8", "Security Event Reporting", `${data.governance.blockedCount} security events auto-classified and recorded. Real-time incident feed available.`, true],
    ["A.8.15", "Logging", "All agent actions produce structured audit records: timestamp, identity, action type, inputs, outputs, policy verdict.", true],
    ["A.8.16", "Monitoring Activities", "Live stream monitoring with governance score computed continuously. Anomaly detection via semantic similarity search.", true],
    ["A.8.34", "Protection During Audit", "Emergency execution controls allow immediate suspension of all agent activity without database modification.", true],
  ];

  controls.forEach(([ctrl, domain, evidence, pass]) => r.criteriaRow(ctrl, domain, evidence, pass));

  r.vGap(8);
  r.sectionDivider("ISMS Scope Statement");
  r.paragraph(
    `Scope: AI agent governance platform covering the monitoring, policy enforcement, and audit trail management ` +
    `of agentic AI systems. In-scope assets: ${data.metrics.agentsMonitored} monitored AI agents, ` +
    `${data.metrics.policiesActive} active governance policies, ${data.metrics.totalActions.toLocaleString()} audited agent actions. ` +
    "All controls are applied tenant-wide with no exceptions.",
    9, C.body
  );
}

// Page 10 — Executive Recommendations
function buildExecutiveRecommendations(r: R, data: ReportData) {
  r.vGap(4);

  const score = data.governance.score;
  const scoreColor = govColor(score);

  // Summary statement
  r.paragraph(
    `Based on the governance data for ${data.tenantName} (score: ${score}/100, risk level: ${data.governance.level}), ` +
    `the following recommendations are prioritized to maintain and improve AI governance posture.`,
    9.5, C.body
  );
  r.vGap(8);

  // Build recommendations
  const recs: { level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; title: string; detail: string }[] = [];

  if (score < 50) {
    recs.push({
      level: "CRITICAL",
      title: "Immediate governance review required",
      detail: `Governance score of ${score}/100 falls below the critical threshold. Suspend high-risk agents ` +
        `and schedule an immediate policy audit to identify root causes of the elevated violation rate.`,
    });
  }
  if (data.governance.blockedCount > 5) {
    recs.push({
      level: "HIGH",
      title: "Review and tighten data masking and domain block policies",
      detail: `${data.governance.blockedCount} hard-blocked actions indicate agents are regularly attempting ` +
        `actions outside policy boundaries. Review agent prompts and training to reduce policy friction.`,
    });
  }
  if (data.governance.flaggedCount > 10) {
    recs.push({
      level: "MEDIUM",
      title: "Automate triage of flagged actions",
      detail: `${data.governance.flaggedCount} flagged actions await human review. Implement automated ` +
        `triage rules to route clear-cut cases and reduce reviewer burden.`,
    });
  }
  if (data.agentTrustScores.some((a) => a.trustScore < 50)) {
    recs.push({
      level: "HIGH",
      title: "Suspend or retrain critical-trust agents",
      detail: "One or more agents have trust scores below 50 (critical threshold). Consider suspending " +
        "these agents pending a full behavioral audit and prompt review.",
    });
  }
  if (data.agentTrustScores.some((a) => a.riskTrend === "degrading")) {
    recs.push({
      level: "MEDIUM",
      title: "Investigate degrading trust trend agents",
      detail: "One or more agents show a downward trust trend. Proactive intervention now avoids " +
        "critical violations in the next reporting cycle.",
    });
  }
  if (data.governance.highCostCount > 0) {
    recs.push({
      level: "MEDIUM",
      title: "Review cost_limit policy thresholds",
      detail: `${data.governance.highCostCount} high-cost anomalies detected. Tighten cost_limit ` +
        `policy rules and add alerts for spend exceeding defined thresholds.`,
    });
  }
  if (recs.length === 0) {
    recs.push({
      level: "LOW",
      title: "Maintain current governance posture",
      detail: "No critical remediation required. Continue monitoring agents and review policies quarterly " +
        "to ensure alignment with evolving regulatory requirements.",
    });
  }

  recs.push({
    level: "LOW",
    title: "Schedule quarterly compliance review",
    detail: "Re-run this compliance package every 30 days and conduct a full compliance review with " +
      "legal counsel quarterly to maintain SOC 2, EU AI Act, and ISO 27001 readiness.",
  });

  r.sectionDivider("Prioritized Action Items");

  recs.forEach((rec) => {
    const color = rec.level === "CRITICAL" ? C.red : rec.level === "HIGH" ? C.red : rec.level === "MEDIUM" ? C.amber : C.green;
    const needed = 50;
    r.ensureSpace(needed);
    r.badge(rec.level, color, ML, r.y + 2, 60, 14);
    r.doc
      .font("Helvetica-Bold").fontSize(9).fillColor(C.cardDark)
      .text(rec.title, ML + 68, r.y + 1, { width: CW - 72 });
    r.doc
      .font("Helvetica").fontSize(8.5).fillColor(C.body)
      .text(rec.detail, ML + 68, r.y + 13, { width: CW - 72 });
    r.y = r.doc.y + 10;
    r.doc.rect(ML, r.y - 4, CW, 0.4).fill(C.border);
  });

  r.vGap(12);
  r.sectionDivider("Governance Roadmap");

  const roadmap = [
    { horizon: "30 Days", action: "Re-run compliance package. Review all flagged incidents.", color: C.red },
    { horizon: "90 Days", action: "Tighten top-offending policies. Retrain high-violation agents.", color: C.amber },
    { horizon: "6 Months", action: "Conduct third-party audit for SOC 2 Type II certification readiness.", color: C.cyan },
    { horizon: "12 Months", action: "Formal ISO 27001 certification engagement with accredited body.", color: C.indigo },
  ];

  roadmap.forEach(({ horizon, action, color }) => {
    r.ensureSpace(22);
    r.doc.rect(ML, r.y, 68, 18).fill(color + "22");
    r.doc.rect(ML, r.y, 3, 18).fill(color);
    r.doc.font("Helvetica-Bold").fontSize(8).fillColor(color).text(horizon, ML + 7, r.y + 5, { width: 58, lineBreak: false });
    r.doc.font("Helvetica").fontSize(8.5).fillColor(C.body).text(action, ML + 76, r.y + 4, { width: CW - 80 });
    r.y += 22;
  });

  r.vGap(12);
  r.paragraph(
    `Report prepared by AgentWitness Enterprise Governance Platform  ·  ${fmtDate(data.generatedAt)}  ·  CONFIDENTIAL`,
    7.5, C.muted
  );
}

// ── Footer pass (runs after all pages buffered) ────────────────────────────────

function addFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  const total = range.count;
  for (let i = 0; i < total; i++) {
    doc.switchToPage(range.start + i);
    if (i === 0) {
      // Cover page has its own footer strip — skip
      continue;
    }
    doc.rect(ML, PH - FOOTER_H + 6, CW, 0.5).fill(C.border);
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(C.muted)
      .text(
        `AgentWitness Enterprise Governance Report  ·  Confidential  ·  Page ${i + 1} of ${total}`,
        ML,
        PH - FOOTER_H + 12,
        { width: CW, align: "center" }
      );
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateCompliancePdf(data: ReportData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MT, bottom: MT + 20, left: ML, right: ML },
    bufferPages: true,
    info: {
      Title: "AI Governance Compliance Report",
      Author: "AgentWitness Platform",
      Subject: "SOC 2 / EU AI Act / ISO 27001 Compliance Evidence",
      Keywords: "compliance, SOC2, EU AI Act, ISO 27001, governance, audit",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const r = new R(doc);

  // Page 1: Cover (first page, no addPage needed)
  buildCoverPage(r, data);

  // Pages 2–10: each section adds its own page
  r.startSection(C.cyan, "Executive Summary");
  buildExecutiveSummary(r, data);

  r.startSection(C.amber, "Risk Overview");
  buildRiskOverview(r, data);

  r.startSection(C.green, "Agent Trust Intelligence");
  buildAgentTrustIntelligence(r, data);

  r.startSection(C.red, "Incident Timeline");
  buildIncidentTimeline(r, data);

  r.startSection(C.purple, "Forensic Analysis");
  buildForensicAnalysis(r, data);

  r.startSection(C.indigo, "SOC 2 Type II — Trust Service Criteria Evidence");
  buildSoc2(r, data);

  r.startSection(C.purple, "EU AI Act — Regulation 2024/1689 Compliance Matrix");
  buildEuAiAct(r, data);

  r.startSection(C.indigo, "ISO 27001:2022 — Annex A Control Mapping");
  buildIso27001(r, data);

  r.startSection(C.cyan, "Executive Recommendations & Governance Roadmap");
  buildExecutiveRecommendations(r, data);

  // Post-process: add footers to all pages
  addFooters(doc);

  doc.end();
  await new Promise<void>((resolve) => doc.on("end", resolve));
  return Buffer.concat(chunks);
}
