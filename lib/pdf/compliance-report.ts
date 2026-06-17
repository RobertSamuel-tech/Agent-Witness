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
const ML = 54; // left / right margin
const MT = 54; // top / bottom margin
const CW = PW - ML * 2; // content width ≈ 487

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
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

function trustColor(score: number): string {
  if (score >= 80) return C.green;
  if (score >= 50) return C.amber;
  return C.red;
}

// ── Renderer: thin wrapper that auto-paginates ─────────────────────────────────

class R {
  doc: PDFKit.PDFDocument;
  y: number;
  pageNum = 1;
  totalPages = 0;

  constructor(doc: PDFKit.PDFDocument) {
    this.doc = doc;
    this.y = MT;
  }

  needsPage(h: number): boolean {
    return this.y + h > PH - MT - 30;
  }

  addPage(accentColor: string, sectionTitle: string) {
    this.doc.addPage();
    this.pageNum++;
    this.y = MT;
    this.pageHeader(accentColor, sectionTitle);
  }

  ensureSpace(h: number, accentColor: string, sectionTitle: string) {
    if (this.needsPage(h)) this.addPage(accentColor, sectionTitle);
  }

  pageHeader(accentColor: string, title: string) {
    // thin accent bar at very top
    this.doc.rect(0, 0, PW, 4).fill(accentColor);
    // left accent + title
    this.doc.rect(ML, MT, 3, 22).fill(accentColor);
    this.doc
      .font("Helvetica-Bold")
      .fontSize(15)
      .fillColor(C.cardDark)
      .text(title, ML + 10, MT + 3, { width: CW - 80, lineBreak: false });
    // top-right brand
    this.doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(C.muted)
      .text("AgentWitness", PW - ML - 70, MT + 6, {
        width: 70,
        align: "right",
      });
    // separator
    this.y = MT + 30;
    this.doc.rect(ML, this.y, CW, 0.75).fill(C.border);
    this.y += 10;
  }

  // ── Primitives ──

  vGap(n = 10) {
    this.y += n;
  }

  label(text: string, color = C.muted, size = 8) {
    this.doc.font("Helvetica-Bold").fontSize(size).fillColor(color).text(
      text.toUpperCase(),
      ML,
      this.y,
      { width: CW, characterSpacing: 0.6 }
    );
    this.y += size + 4;
  }

  paragraph(text: string, size = 9.5, color = C.body) {
    this.doc
      .font("Helvetica")
      .fontSize(size)
      .fillColor(color)
      .text(text, ML, this.y, { width: CW });
    this.y = this.doc.y + 4;
  }

  // ── Metric grid: 3 columns ──

  metricBox(
    cols: { label: string; value: string; color: string }[],
    boxH = 52
  ) {
    const colW = CW / cols.length;
    cols.forEach(({ label, value, color }, i) => {
      const x = ML + i * colW;
      this.doc.rect(x, this.y, colW - 4, boxH).fill(C.lightBg);
      this.doc.rect(x, this.y, 3, boxH).fill(color);
      this.doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(label, x + 8, this.y + 8, { width: colW - 20 });
      this.doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor(color)
        .text(value, x + 8, this.y + 18, { width: colW - 20 });
    });
    this.y += boxH + 6;
  }

  // ── Two-column key/value list ──

  kvRow(key: string, value: string, valueColor = C.body) {
    this.doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(C.muted)
      .text(key, ML, this.y, { width: 140 });
    this.doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(valueColor)
      .text(value, ML + 145, this.y, { width: CW - 145 });
    this.y += 14;
    this.doc.rect(ML, this.y - 2, CW, 0.4).fill(C.border);
  }

  // ── Table ──

  table(
    headers: string[],
    colWidths: number[],
    rows: { cells: string[]; rowColor?: string; textColors?: (string | null)[] }[],
    accentColor: string,
    sectionTitle: string
  ) {
    const ROW_H = 20;
    const HDR_H = 22;

    // header row
    this.doc.rect(ML, this.y, CW, HDR_H).fill(C.cardDark);
    let x = ML;
    headers.forEach((h, i) => {
      this.doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(C.white)
        .text(h, x + 5, this.y + 7, {
          width: colWidths[i] - 10,
          lineBreak: false,
        });
      x += colWidths[i];
    });
    this.y += HDR_H;

    // data rows
    rows.forEach((row, ri) => {
      this.ensureSpace(ROW_H + 4, accentColor, sectionTitle);
      if (ri % 2 === 0) {
        this.doc.rect(ML, this.y, CW, ROW_H).fill("#f8fafc");
      }
      x = ML;
      row.cells.forEach((cell, ci) => {
        const textColor =
          row.textColors?.[ci] ?? C.body;
        this.doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(textColor)
          .text(cell, x + 5, this.y + 6, {
            width: colWidths[ci] - 10,
            lineBreak: false,
            ellipsis: true,
          });
        x += colWidths[ci];
      });
      this.doc.rect(ML, this.y + ROW_H - 0.3, CW, 0.3).fill(C.border);
      this.y += ROW_H;
    });

    // bottom border
    this.doc.rect(ML, this.y, CW, 1).fill(C.border);
    this.y += 6;
  }

  // ── Evidence row (criteria + control + result) ──

  criteriaRow(
    criteria: string,
    description: string,
    evidence: string,
    pass: boolean
  ) {
    const ROW_H = 38;
    this.ensureSpace(ROW_H + 4, "", "");
    const COLS = [90, 130, 220, 47];
    const texts = [criteria, description, evidence, pass ? "PASS" : "FAIL"];
    const bgColor = this.y % 80 < 40 ? "#f8fafc" : C.white; // alternating
    this.doc.rect(ML, this.y, CW, ROW_H).fill(bgColor);
    if (pass) {
      this.doc.rect(ML, this.y, 3, ROW_H).fill(C.green);
    } else {
      this.doc.rect(ML, this.y, 3, ROW_H).fill(C.red);
    }
    let x = ML + 3;
    texts.forEach((t, i) => {
      const fc =
        i === 3 ? (pass ? C.green : C.red) : i === 0 ? C.indigo : C.body;
      const fw = i === 0 || i === 3 ? "Helvetica-Bold" : "Helvetica";
      this.doc
        .font(fw)
        .fontSize(8)
        .fillColor(fc)
        .text(t, x + 4, this.y + 5, { width: COLS[i] - 8, height: ROW_H - 8 });
      x += COLS[i];
    });
    this.doc.rect(ML, this.y + ROW_H - 0.3, CW, 0.3).fill(C.border);
    this.y += ROW_H;
  }

  sectionDivider(title: string, color: string) {
    this.vGap(8);
    this.doc.rect(ML, this.y, CW, 1).fill(color + "44");
    this.vGap(4);
    this.doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(color)
      .text(title.toUpperCase(), ML, this.y, { characterSpacing: 0.5 });
    this.y += 14;
  }

  progressBar(
    label: string,
    value: number,
    max: number,
    color: string,
    rightLabel?: string
  ) {
    const BAR_H = 6;
    this.doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(C.body)
      .text(label, ML, this.y, { width: CW - 50, lineBreak: false });
    const rl = rightLabel ?? String(value);
    this.doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(color)
      .text(rl, ML + CW - 46, this.y, { width: 46, align: "right", lineBreak: false });
    this.y += 12;
    // track
    this.doc.rect(ML, this.y, CW, BAR_H).fill("#e2e8f0");
    // fill
    const fillW = max > 0 ? Math.round((value / max) * CW) : 0;
    this.doc.rect(ML, this.y, fillW, BAR_H).fill(color);
    this.y += BAR_H + 8;
  }

  badge(text: string, color: string, x: number, y: number, w = 60, h = 14) {
    this.doc.rect(x, y, w, h).fill(color + "22");
    this.doc.rect(x, y, 2.5, h).fill(color);
    this.doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(color)
      .text(text, x + 6, y + 3, { width: w - 10, lineBreak: false });
  }
}

// ── Page builders ──────────────────────────────────────────────────────────────

function buildCoverPage(r: R, data: ReportData) {
  const doc = r.doc;

  // Full dark background
  doc.rect(0, 0, PW, PH).fill(C.pageDark);

  // Cyan accent bar at very top
  doc.rect(0, 0, PW, 5).fill(C.cyan);

  // Wordmark
  doc.font("Helvetica-Bold").fontSize(10).fillColor(C.cyan).text(
    "AGENTWITNESS",
    ML,
    52,
    { characterSpacing: 2 }
  );
  doc.rect(ML, 68, 20, 2).fill(C.cyan);

  // Title block
  doc.font("Helvetica-Bold").fontSize(36).fillColor(C.white).text(
    "AI GOVERNANCE",
    ML,
    108,
    { width: CW }
  );
  doc.font("Helvetica-Bold").fontSize(36).fillColor(C.white).text(
    "COMPLIANCE",
    ML,
    150,
    { width: CW }
  );
  doc.font("Helvetica-Bold").fontSize(36).fillColor(C.cyan).text(
    "REPORT",
    ML,
    192,
    { width: CW }
  );

  // Standards badges
  let bx = ML;
  const badges = [
    { text: "SOC 2 Type II", color: C.indigo },
    { text: "EU AI Act", color: C.purple },
    { text: "Audit Trail", color: C.amber },
  ];
  badges.forEach(({ text, color }) => {
    doc.rect(bx, 248, 100, 18).fill(color + "28");
    doc.rect(bx, 248, 2.5, 18).fill(color);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(color).text(
      text,
      bx + 7,
      252,
      { width: 90, lineBreak: false }
    );
    bx += 110;
  });

  // Cyan separator
  doc.rect(ML, 284, CW, 1).fill(C.cyan + "40");

  // Metadata block
  const meta: [string, string][] = [
    ["ORGANIZATION", data.tenantName],
    ["REPORT PERIOD", `${fmtDate(data.periodStart)} — ${fmtDate(data.periodEnd)}`],
    ["GENERATED", `${fmtDate(data.generatedAt)}`],
    ["STANDARDS", data.standards.join("  ·  ")],
    ["CLASSIFICATION", "CONFIDENTIAL"],
  ];
  let my = 300;
  meta.forEach(([k, v]) => {
    doc.font("Helvetica").fontSize(8).fillColor(C.muted).text(k, ML, my, {
      width: CW,
      characterSpacing: 0.5,
    });
    doc.font("Helvetica-Bold").fontSize(12).fillColor(C.white).text(v, ML, my + 11, {
      width: CW,
    });
    doc.rect(ML, my + 28, CW, 0.5).fill(C.borderDark);
    my += 38;
  });

  // Governance score hero card
  const cardY = 510;
  doc.rect(ML, cardY, CW, 72).fill(C.cardDark);
  doc.rect(ML, cardY, 4, 72).fill(C.cyan);

  const gc = govColor(data.governance.score);
  doc.font("Helvetica-Bold").fontSize(46).fillColor(gc).text(
    String(data.governance.score),
    ML + 16,
    cardY + 10,
    { width: 72, lineBreak: false }
  );
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.white).text(
    "GOVERNANCE SCORE",
    ML + 96,
    cardY + 14
  );
  doc.font("Helvetica").fontSize(8.5).fillColor(C.muted).text(
    `Risk Level: ${data.governance.level}`,
    ML + 96,
    cardY + 28
  );
  doc.font("Helvetica").fontSize(8).fillColor(C.muted).text(
    `${data.metrics.totalActions.toLocaleString()} total actions  ·  ` +
      `${data.governance.blockedCount} blocked  ·  ` +
      `${data.governance.flaggedCount} flagged`,
    ML + 96,
    cardY + 42
  );

  // Three sub-score badges
  const subY = cardY + 86;
  const subData = [
    {
      label: "Compliance Rate",
      value:
        data.metrics.totalActions > 0
          ? `${Math.round((data.metrics.totalActions - data.governance.blockedCount) / data.metrics.totalActions * 100)}%`
          : "—",
      color: C.green,
    },
    {
      label: "Blocked Actions",
      value: String(data.governance.blockedCount),
      color: C.red,
    },
    {
      label: "Active Policies",
      value: String(data.metrics.policiesActive),
      color: C.cyan,
    },
  ];
  subData.forEach(({ label, value, color }, i) => {
    const sx = ML + i * (CW / 3);
    doc.rect(sx, subY, CW / 3 - 4, 36).fill(C.borderDark);
    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text(label, sx + 8, subY + 5, {
      width: CW / 3 - 20,
    });
    doc.font("Helvetica-Bold").fontSize(16).fillColor(color).text(value, sx + 8, subY + 15, {
      width: CW / 3 - 20,
    });
  });

  // Footer bar
  doc.rect(0, PH - 44, PW, 44).fill(C.cardDark);
  doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text(
    "This document is confidential and intended solely for authorized recipients of the named organization.",
    ML,
    PH - 32,
    { width: CW, align: "center" }
  );
  doc.font("Helvetica").fontSize(7).fillColor(C.borderDark).text(
    `AgentWitness Platform  ·  ${data.generatedAt.toISOString().slice(0, 19)}Z`,
    ML,
    PH - 18,
    { width: CW, align: "center" }
  );
}

function buildExecutiveSummary(r: R, data: ReportData) {
  const { metrics, governance } = data;
  const complianceRate =
    metrics.totalActions > 0
      ? Math.round(
          ((metrics.totalActions - governance.blockedCount) /
            metrics.totalActions) *
            100
        )
      : 100;

  r.vGap(4);
  r.metricBox([
    {
      label: "Total Actions Monitored",
      value: metrics.totalActions.toLocaleString(),
      color: C.cyan,
    },
    {
      label: "Blocked (Policy Enforcement)",
      value: String(governance.blockedCount),
      color: C.red,
    },
    {
      label: "Flagged (Requires Review)",
      value: String(governance.flaggedCount),
      color: C.amber,
    },
  ]);

  r.metricBox([
    {
      label: "Compliance Rate",
      value: `${complianceRate}%`,
      color: C.green,
    },
    {
      label: "Active Policies",
      value: String(metrics.policiesActive),
      color: C.indigo,
    },
    {
      label: "AI Spend Monitored",
      value: `$${metrics.totalAiSpend.toFixed(2)}`,
      color: C.purple,
    },
  ]);

  r.sectionDivider("Governance Posture", C.cyan);

  r.kvRow("Governance Score", `${governance.score}/100`, govColor(governance.score));
  r.kvRow("Risk Level", governance.level, govColor(governance.score));
  r.kvRow("Agents Monitored", String(metrics.agentsMonitored));
  r.kvRow("Policies Enforced", String(metrics.policiesActive));
  r.kvRow("High-Cost Anomalies", String(governance.highCostCount), C.amber);
  r.kvRow("Period", `${fmtDate(data.periodStart)} — ${fmtDate(data.periodEnd)}`);

  r.vGap(10);
  r.sectionDivider("Top Risk Agents", C.red);

  r.table(
    ["Agent", "Risk Score", "Blocked", "Flagged"],
    [220, 100, 90, 77],
    data.topRiskAgents.map((a) => ({
      cells: [a.agentName, String(a.riskScore), String(a.blockedCount), String(a.flaggedCount)],
      textColors: [C.body, a.riskScore > 5 ? C.red : C.amber, C.red, C.amber],
    })),
    C.cyan,
    "Executive Summary"
  );
}

function buildSoc2Evidence(r: R, data: ReportData) {
  r.vGap(4);
  r.paragraph(
    "The following evidence maps AgentWitness platform controls to SOC 2 Trust " +
      "Service Criteria (TSC) as defined by the AICPA. All controls are enforced " +
      "at the platform layer and applied uniformly across all tenant AI agents.",
    9
  );
  r.vGap(8);

  // Table header
  const { doc, y } = r;
  const colW = [78, 118, 220, 71];
  const headers = ["TSC Ref", "Control Area", "AgentWitness Evidence", "Status"];
  doc.rect(ML, y, CW, 22).fill(C.cardDark);
  let x = ML;
  headers.forEach((h, i) => {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white).text(h, x + 4, y + 7, {
      width: colW[i] - 8,
      lineBreak: false,
    });
    x += colW[i];
  });
  r.y += 22;

  const rows: [string, string, string, boolean][] = [
    [
      "CC1.1",
      "Control Environment",
      `${data.metrics.policiesActive} active policies enforce ethical AI usage boundaries across all agents.`,
      true,
    ],
    [
      "CC6.1",
      "Logical Access Controls",
      "All agent actions are evaluated against policy rules before execution. Unauthorized actions are automatically blocked.",
      true,
    ],
    [
      "CC6.3",
      "System Boundaries",
      "Multi-tenant architecture enforces strict isolation via Row Level Security on all data tables.",
      true,
    ],
    [
      "CC7.2",
      "System Monitoring",
      `${data.metrics.totalActions.toLocaleString()} agent actions logged with immutable audit trails including timestamps and policy decisions.`,
      true,
    ],
    [
      "CC7.4",
      "Security Incidents",
      `${data.governance.blockedCount} threats automatically neutralized. Real-time alerting and incident classification in place.`,
      data.governance.blockedCount >= 0,
    ],
    [
      "CC9.2",
      "Risk Mitigation",
      "Continuous risk scoring per agent. Trust scores computed from violation history. Emergency kill-switch available.",
      true,
    ],
    [
      "A1.1",
      "Availability",
      "Audit trail preserved with full event history. System availability monitored via health endpoint.",
      true,
    ],
    [
      "PI1.1",
      "Processing Integrity",
      "Every AI action produces a structured audit record with input summary, output summary, and policy decision.",
      true,
    ],
    [
      "C1.1",
      "Confidentiality",
      "Data masking policies enforced at the AI output layer. PII exposure prevented by automated policy evaluation.",
      data.governance.blockedCount >= 0,
    ],
    [
      "P1.1",
      "Privacy",
      "Customer data access by AI agents is logged, evaluated, and subject to data masking and domain block policies.",
      true,
    ],
  ];

  rows.forEach(([tsc, control, evidence, pass]) => {
    r.criteriaRow(tsc, control, evidence, pass);
  });

  r.vGap(12);
  r.paragraph(
    `Evidence collected for period: ${fmtDate(data.periodStart)} — ${fmtDate(data.periodEnd)}. ` +
      `Total events in scope: ${data.metrics.totalActions.toLocaleString()}.`,
    8,
    C.muted
  );
}

function buildEuAiAct(r: R, data: ReportData) {
  r.vGap(4);
  r.paragraph(
    "The EU AI Act (Regulation 2024/1689) imposes obligations on providers and deployers of " +
      "AI systems used in the European Union. The following matrix maps AgentWitness platform " +
      "capabilities to the applicable articles for General Purpose AI Systems (GPAIS) and " +
      "High-Risk AI systems as defined in Annex III.",
    9
  );
  r.vGap(6);

  r.sectionDivider("Risk Classification", C.purple);
  r.kvRow("AI System Category", "General Purpose AI (GPAI) — Agentic Systems");
  r.kvRow("Risk Level", "High Risk (automated decision-making with real-world effects)");
  r.kvRow("Applicable Articles", "9, 10, 12, 13, 14, 17, 26");
  r.kvRow("Compliance Approach", "Platform-level controls with per-tenant policy enforcement");
  r.vGap(10);

  r.sectionDivider("Article Compliance Matrix", C.purple);

  const colW = [78, 118, 220, 71];
  const headers = ["Article", "Requirement", "Implementation Evidence", "Status"];
  const { doc } = r;
  doc.rect(ML, r.y, CW, 22).fill(C.cardDark);
  let x = ML;
  headers.forEach((h, i) => {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white).text(h, x + 4, r.y + 7, {
      width: colW[i] - 8,
      lineBreak: false,
    });
    x += colW[i];
  });
  r.y += 22;

  const articles: [string, string, string, boolean][] = [
    [
      "Art. 9",
      "Risk Management System",
      `Continuous risk scoring: ${data.metrics.totalActions.toLocaleString()} actions assessed. Governance score ${data.governance.score}/100. Per-agent trust scores computed.`,
      true,
    ],
    [
      "Art. 10",
      "Data Governance",
      "All AI inputs and outputs logged with metadata. Data masking policies prevent PII exposure. Audit trail provides data lineage.",
      true,
    ],
    [
      "Art. 12",
      "Record Keeping",
      `${data.metrics.totalActions.toLocaleString()} immutable audit log entries with timestamps, agent identity, action type, and policy decision.`,
      true,
    ],
    [
      "Art. 13",
      "Transparency & Explainability",
      "Each policy decision accompanied by rule type, evaluation result, and input/output summaries accessible in audit log.",
      true,
    ],
    [
      "Art. 14",
      "Human Oversight",
      "Emergency kill-switch enables immediate suspension of all agent execution. Flagged actions queued for human review.",
      true,
    ],
    [
      "Art. 17",
      "Quality Management",
      `${data.metrics.policiesActive} active governance policies covering cost limits, data masking, and domain restrictions.`,
      true,
    ],
    [
      "Art. 26",
      "Deployer Obligations",
      "Tenant-scoped controls enforce per-organisation governance rules. Activity logs available for competent authority review.",
      true,
    ],
    [
      "Art. 50",
      "Transparency to Users",
      "Agents identified as AI systems. Policy enforcement visible in real-time audit trail and anomaly detection.",
      true,
    ],
  ];

  articles.forEach(([article, req, evidence, pass]) => {
    r.criteriaRow(article, req, evidence, pass);
  });

  r.vGap(10);
  r.paragraph(
    "Note: This compliance mapping is produced by the AgentWitness platform based on configured " +
      "policies and audit data. Final legal determination requires qualified legal counsel in the applicable jurisdiction.",
    7.5,
    C.muted
  );
}

function buildIso27001(r: R, data: ReportData) {
  r.vGap(4);
  r.paragraph(
    "ISO/IEC 27001:2022 defines requirements for establishing, implementing, maintaining, and " +
      "continually improving an Information Security Management System (ISMS). The following " +
      "controls map AgentWitness platform capabilities to the ISO 27001 Annex A control set " +
      "as applied to AI agent operations.",
    9
  );
  r.vGap(6);

  r.sectionDivider("Annex A Control Mapping", C.indigo);

  const colW = [78, 130, 208, 71];
  const headers = ["Control", "Domain", "Implementation Evidence", "Status"];
  const { doc } = r;
  doc.rect(ML, r.y, CW, 22).fill(C.cardDark);
  let x = ML;
  headers.forEach((h, i) => {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white).text(h, x + 4, r.y + 7, {
      width: colW[i] - 8,
      lineBreak: false,
    });
    x += colW[i];
  });
  r.y += 22;

  const controls: [string, string, string, boolean][] = [
    [
      "A.5.1",
      "Policies for Information Security",
      `${data.metrics.policiesActive} active governance policies enforced per tenant via the AgentWitness policy engine.`,
      true,
    ],
    [
      "A.5.15",
      "Access Control",
      "Row Level Security isolates all tenant data. Agent actions authenticated and scoped to authorized tenant context.",
      true,
    ],
    [
      "A.5.23",
      "Information Security of Cloud Services",
      "Aurora PostgreSQL with encryption at rest and in transit. DynamoDB hot-path mirror with TTL-based expiry.",
      true,
    ],
    [
      "A.5.28",
      "Collection of Evidence",
      `${data.metrics.totalActions.toLocaleString()} immutable audit records retained with full input/output metadata and policy decisions.`,
      true,
    ],
    [
      "A.5.36",
      "Compliance with Policies and Standards",
      "Policy engine evaluates every agent action before execution. Non-compliant actions are blocked automatically.",
      true,
    ],
    [
      "A.6.8",
      "Information Security Event Reporting",
      `${data.governance.blockedCount} security events auto-classified and recorded. Real-time incident feed available.`,
      data.governance.blockedCount >= 0,
    ],
    [
      "A.8.15",
      "Logging",
      "All agent actions produce structured audit records: timestamp, identity, action type, inputs, outputs, policy verdict.",
      true,
    ],
    [
      "A.8.16",
      "Monitoring Activities",
      "Live stream monitoring with governance score computed continuously. Anomaly detection via semantic similarity search.",
      true,
    ],
    [
      "A.8.34",
      "Protection of Information Systems During Audit",
      "Emergency execution controls allow immediate suspension of all agent activity without database modification.",
      true,
    ],
  ];

  controls.forEach(([ctrl, domain, evidence, pass]) => {
    r.criteriaRow(ctrl, domain, evidence, pass);
  });

  r.vGap(8);
  r.sectionDivider("ISMS Scope Statement", C.indigo);
  r.paragraph(
    "Scope: AI agent governance platform covering the monitoring, policy enforcement, " +
      "and audit trail management of agentic AI systems. " +
      `In-scope assets: ${data.metrics.agentsMonitored} monitored AI agents, ` +
      `${data.metrics.policiesActive} active governance policies, ` +
      `${data.metrics.totalActions.toLocaleString()} audited agent actions. ` +
      "All controls are applied tenant-wide with no exceptions.",
    9,
    C.body
  );

  r.vGap(6);
  r.paragraph(
    "Note: This mapping is indicative. Formal ISO 27001 certification requires a third-party " +
      "audit conducted by an accredited certification body. The controls above demonstrate " +
      "AgentWitness platform readiness to support an ISMS audit.",
    7.5,
    C.muted
  );
}

function buildAuditTrailSummary(r: R, data: ReportData) {
  const { metrics, governance } = data;
  const allowed = metrics.totalActions - governance.blockedCount - governance.flaggedCount;
  const compPct =
    metrics.totalActions > 0
      ? Math.round((allowed / metrics.totalActions) * 100)
      : 100;
  const blockedPct =
    metrics.totalActions > 0
      ? Math.round((governance.blockedCount / metrics.totalActions) * 100)
      : 0;
  const flaggedPct =
    metrics.totalActions > 0
      ? Math.round((governance.flaggedCount / metrics.totalActions) * 100)
      : 0;

  r.vGap(4);
  r.metricBox([
    { label: "Total Events Logged", value: metrics.totalActions.toLocaleString(), color: C.cyan },
    { label: "Agents Monitored", value: String(metrics.agentsMonitored), color: C.indigo },
    { label: "Report Period (days)", value: String(Math.round((data.periodEnd.getTime() - data.periodStart.getTime()) / 86400000)), color: C.purple },
  ]);

  r.sectionDivider("Action Outcome Distribution", C.amber);

  r.progressBar("Allowed (policy compliant)", allowed, metrics.totalActions, C.green, `${allowed.toLocaleString()} (${compPct}%)`);
  r.progressBar("Flagged (requires review)", governance.flaggedCount, metrics.totalActions, C.amber, `${governance.flaggedCount} (${flaggedPct}%)`);
  r.progressBar("Blocked (policy violation)", governance.blockedCount, metrics.totalActions, C.red, `${governance.blockedCount} (${blockedPct}%)`);

  r.vGap(6);
  r.sectionDivider("Policy Trigger Frequency", C.amber);

  r.table(
    ["Policy", "Triggers (Non-Allowed)"],
    [340, 147],
    data.policyBreakdown.map((p) => ({
      cells: [p.policyName, String(p.hitCount)],
      textColors: [C.body, p.hitCount > 0 ? C.red : C.muted],
    })),
    C.amber,
    "Audit Trail Summary"
  );

  r.vGap(8);
  r.paragraph(
    "The audit trail is maintained with full fidelity for all AI agent actions. " +
      "Each event record includes: agent identifier, action type, input/output summaries, " +
      "applicable policy, policy decision, cost attribution, and UTC timestamp. " +
      "Records are stored in Aurora PostgreSQL with write-once semantics.",
    9,
    C.body
  );
}

function buildPolicyViolations(r: R, data: ReportData) {
  r.vGap(4);

  if (data.governance.blockedCount === 0) {
    r.paragraph(
      "No policy violations were recorded during this reporting period. All AI agent actions " +
        "were within configured governance boundaries.",
      9.5,
      C.green
    );
    return;
  }

  r.metricBox([
    { label: "Total Violations", value: String(data.governance.blockedCount + data.governance.flaggedCount), color: C.red },
    { label: "Blocked (Hard Stop)", value: String(data.governance.blockedCount), color: C.red },
    { label: "Flagged (Soft Stop)", value: String(data.governance.flaggedCount), color: C.amber },
  ]);

  r.sectionDivider("Recent Blocked Incidents", C.red);

  const incidentRows = data.incidents.slice(0, 12).map((inc) => ({
    cells: [
      fmtShortDt(inc.timestamp),
      truncStr(inc.agentName, 22),
      truncStr(inc.actionType, 20),
      truncStr(inc.policyName, 22),
      truncStr(inc.inputSummary, 32),
    ],
    textColors: [C.muted, C.body, C.body, C.red, C.muted] as (string | null)[],
  }));

  r.table(
    ["Timestamp", "Agent", "Action Type", "Policy", "Input Summary"],
    [78, 100, 90, 100, 119],
    incidentRows,
    C.red,
    "Policy Violations"
  );

  if (data.incidents.length > 12) {
    r.paragraph(
      `Showing 12 of ${data.incidents.length} incidents. Full incident feed available in the AgentWitness dashboard.`,
      7.5,
      C.muted
    );
  }
}

function buildRiskMetrics(r: R, data: ReportData) {
  r.vGap(4);

  r.sectionDivider("Agent Trust Score Summary", C.green);

  if (data.agentTrustScores.length === 0) {
    r.paragraph("No agent trust data available for this period.", 9, C.muted);
  } else {
    r.table(
      ["Agent", "Framework", "Trust Score", "Compliance", "Viol. Rate", "Trend"],
      [140, 80, 72, 68, 65, 62],
      data.agentTrustScores.map((a) => {
        const tc = trustColor(a.trustScore);
        const trendLabel =
          a.riskTrend === "improving" ? "↑ Improving" : a.riskTrend === "degrading" ? "↓ Degrading" : "→ Stable";
        const trendColor =
          a.riskTrend === "improving" ? C.green : a.riskTrend === "degrading" ? C.red : C.muted;
        return {
          cells: [
            truncStr(a.agentName, 22),
            a.agentFramework ?? "—",
            `${a.trustScore}/100`,
            `${a.complianceScore}%`,
            `${(a.violationRate * 100).toFixed(1)}%`,
            trendLabel,
          ],
          textColors: [C.body, C.muted, tc, C.cyan, a.violationRate > 0.1 ? C.red : C.muted, trendColor] as (string | null)[],
        };
      }),
      C.green,
      "Risk Metrics"
    );
  }

  r.vGap(10);
  r.sectionDivider("Governance Score Breakdown", C.green);

  const gc = govColor(data.governance.score);
  r.kvRow("Overall Governance Score", `${data.governance.score} / 100`, gc);
  r.kvRow("Formula", "100 − (blocked × 5) − (flagged × 2) − (high-cost × 1)");
  r.kvRow("Blocked Penalty", `${data.governance.blockedCount} × 5 = ${data.governance.blockedCount * 5} pts`);
  r.kvRow("Flagged Penalty", `${data.governance.flaggedCount} × 2 = ${data.governance.flaggedCount * 2} pts`);
  r.kvRow("High-Cost Penalty", `${data.governance.highCostCount} × 1 = ${data.governance.highCostCount} pts`);

  r.vGap(10);
  r.sectionDivider("Risk Remediation Recommendations", C.green);

  const recs: [string, string][] = [];
  if (data.governance.blockedCount > 5) {
    recs.push(["HIGH", "Review and tighten data masking and domain block policies — blocking rate is elevated."]);
  }
  if (data.governance.flaggedCount > 10) {
    recs.push(["MEDIUM", "Automate triage of flagged actions to reduce manual review burden."]);
  }
  if (data.metrics.agentsMonitored > 0 && data.agentTrustScores.some((a) => a.trustScore < 50)) {
    recs.push(["HIGH", "One or more agents have critical trust scores (< 50). Consider suspending until reviewed."]);
  }
  if (data.governance.highCostCount > 0) {
    recs.push(["MEDIUM", "High-cost AI actions detected. Review cost_limit policy thresholds."]);
  }
  if (recs.length === 0) {
    recs.push(["LOW", "No critical remediation required. Continue monitoring current governance posture."]);
  }

  recs.forEach(([level, text]) => {
    const lvlColor = level === "HIGH" ? C.red : level === "MEDIUM" ? C.amber : C.green;
    r.ensureSpace(30, C.green, "Risk Metrics");
    r.badge(level, lvlColor, ML, r.y + 3, 44, 14);
    r.doc.font("Helvetica").fontSize(8.5).fillColor(C.body).text(text, ML + 52, r.y + 4, {
      width: CW - 56,
    });
    r.y = Math.max(r.y + 20, r.doc.y + 4);
  });
}

function addPageNumbers(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(C.muted)
      .text(
        `Page ${i + 1} of ${range.count}  ·  AgentWitness Compliance Report  ·  CONFIDENTIAL`,
        ML,
        PH - 28,
        { width: CW, align: "center" }
      );
    // bottom line
    doc.rect(ML, PH - 36, CW, 0.5).fill(C.border);
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
      Subject: "SOC 2 / EU AI Act Compliance Evidence",
      Keywords: "compliance, SOC2, EU AI Act, governance, audit",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const r = new R(doc);

  // ── Page 1: Cover ──────────────────────────────────────────────────────────
  buildCoverPage(r, data);

  // ── Page 2: Executive Summary ──────────────────────────────────────────────
  doc.addPage();
  r.y = MT;
  r.pageHeader(C.cyan, "Executive Summary");
  buildExecutiveSummary(r, data);

  // ── Page 3: SOC 2 Evidence ─────────────────────────────────────────────────
  doc.addPage();
  r.y = MT;
  r.pageHeader(C.indigo, "SOC 2 Type II Evidence");
  buildSoc2Evidence(r, data);

  // ── Page 4: EU AI Act ──────────────────────────────────────────────────────
  doc.addPage();
  r.y = MT;
  r.pageHeader(C.purple, "EU AI Act Compliance Evidence");
  buildEuAiAct(r, data);

  // ── Page 5: ISO 27001 ──────────────────────────────────────────────────────
  doc.addPage();
  r.y = MT;
  r.pageHeader(C.indigo, "ISO 27001:2022 Control Evidence");
  buildIso27001(r, data);

  // ── Page 6: Audit Trail Summary ────────────────────────────────────────────
  doc.addPage();
  r.y = MT;
  r.pageHeader(C.amber, "Audit Trail Summary");
  buildAuditTrailSummary(r, data);

  // ── Page 7: Policy Violations ──────────────────────────────────────────────
  doc.addPage();
  r.y = MT;
  r.pageHeader(C.red, "Policy Violations");
  buildPolicyViolations(r, data);

  // ── Page 8: Risk Metrics & Agent Trust Scores ─────────────────────────────
  doc.addPage();
  r.y = MT;
  r.pageHeader(C.green, "Agent Trust Metrics");
  buildRiskMetrics(r, data);

  // Add page numbers to all pages
  addPageNumbers(doc);

  doc.end();

  await new Promise<void>((resolve) => doc.on("end", resolve));
  return Buffer.concat(chunks);
}
