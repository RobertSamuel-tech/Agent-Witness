import { NextRequest, NextResponse } from "next/server";
import { getAllRecentEvents } from "@/lib/dynamodb";
import type { AgentEvent } from "@/lib/dynamodb";

// ── Response shape ─────────────────────────────────────────────────────────────

export interface LiveStreamResponse {
  events: AgentEvent[];
  agentsOnline: number;
  actionsPerMin: number;
  blockedToday: number;
  governanceScore: number;
  updatedAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// ── KPI helpers ────────────────────────────────────────────────────────────────

function computeKpis(events: AgentEvent[]): {
  agentsOnline: number;
  actionsPerMin: number;
  blockedToday: number;
  governanceScore: number;
} {
  const now = Date.now();
  const fiveMinutesAgo = new Date(now - 5 * 60_000).toISOString();
  const oneMinuteAgo = new Date(now - 60_000).toISOString();

  // todayStart: midnight UTC of the current day
  const d = new Date();
  const todayStart = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  ).toISOString();

  // Agents that produced at least one event in the last 5 minutes
  const agentsOnline = new Set(
    events.filter((e) => e.timestamp >= fiveMinutesAgo).map((e) => e.agentId)
  ).size;

  // Raw action throughput in the last 60 seconds
  const actionsPerMin = events.filter((e) => e.timestamp >= oneMinuteAgo).length;

  // Blocked events that occurred since midnight UTC today
  const blockedToday = events.filter(
    (e) => e.timestamp >= todayStart && e.payload["policyResult"] === "blocked"
  ).length;

  // Governance score — matches Aurora formula:
  // 100 − (blocked × 5) − (flagged × 2), clamped to [0, 100]
  const totalBlocked = events.filter(
    (e) => e.payload["policyResult"] === "blocked"
  ).length;
  const totalFlagged = events.filter(
    (e) => e.payload["policyResult"] === "flagged"
  ).length;
  const rawScore = 100 - totalBlocked * 5 - totalFlagged * 2;
  const governanceScore = Math.max(0, Math.min(100, rawScore));

  return { agentsOnline, actionsPerMin, blockedToday, governanceScore };
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Optional tenant filter — if provided it must be a valid UUID
  const tenantHeader = request.headers.get("x-tenant-id");
  if (tenantHeader !== null && !UUID_PATTERN.test(tenantHeader)) {
    return NextResponse.json(
      { error: "Invalid x-tenant-id header — must be a UUID or omitted" },
      { status: 400 }
    );
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(limitParam ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );

  try {
    // Scan up to 4× requested limit so client-side sort + tenant filter has
    // enough headroom (same strategy as /api/events).
    const raw = await getAllRecentEvents(limit * 4);

    // Filter to tenant when header is present; otherwise return cross-tenant view
    const filtered = tenantHeader
      ? raw.filter((e) => e.tenantId === tenantHeader)
      : raw;

    const events = filtered.slice(0, limit);
    const { agentsOnline, actionsPerMin, blockedToday, governanceScore } =
      computeKpis(filtered); // KPIs computed over full filtered set, not truncated slice

    const body: LiveStreamResponse = {
      events,
      agentsOnline,
      actionsPerMin,
      blockedToday,
      governanceScore,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("GET /api/live-stream failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
