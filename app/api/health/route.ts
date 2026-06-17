import { NextResponse } from "next/server";
import { executeSql, getNumber, getString } from "@/lib/db";
import { embedText } from "@/lib/ai/embedder";

type ServiceStatus = "connected" | "disconnected";

interface HealthResponse {
  status: "ok" | "degraded";
  services: {
    aurora: ServiceStatus;
    openrouter: ServiceStatus;
    pgvector: ServiceStatus;
  };
  database: {
    rlsPolicies: number;
    rowCount: number;
    pgvectorVersion: string | null;
  };
  timestamp: string;
}

async function checkAurora(): Promise<ServiceStatus> {
  try {
    await executeSql("SELECT 1");
    return "connected";
  } catch (error) {
    console.error("Health check: Aurora connectivity failed", error);
    return "disconnected";
  }
}

async function checkOpenRouter(): Promise<ServiceStatus> {
  try {
    await embedText("health_check");
    return "connected";
  } catch (error) {
    console.error("Health check: OpenRouter connectivity failed", error);
    return "disconnected";
  }
}

async function checkPgvector(): Promise<{ status: ServiceStatus; version: string | null }> {
  try {
    const rows = await executeSql(
      `SELECT extversion FROM pg_extension WHERE extname = 'vector'`
    );
    if (rows.length === 0) return { status: "disconnected", version: null };
    return { status: "connected", version: getString(rows[0], "extversion") };
  } catch (error) {
    console.error("Health check: pgvector check failed", error);
    return { status: "disconnected", version: null };
  }
}

async function getRlsPolicyCount(): Promise<number> {
  try {
    const rows = await executeSql(
      `SELECT COUNT(*) AS cnt FROM pg_policies WHERE tablename = 'agent_actions'`
    );
    return rows.length > 0 ? getNumber(rows[0], "cnt") : 0;
  } catch {
    return 0;
  }
}

async function getRowCount(): Promise<number> {
  try {
    const rows = await executeSql(`SELECT COUNT(*) AS cnt FROM agent_actions`);
    return rows.length > 0 ? getNumber(rows[0], "cnt") : 0;
  } catch {
    return 0;
  }
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const [aurora, openrouter, pgvectorResult, rlsPolicies, rowCount] = await Promise.all([
    checkAurora(),
    checkOpenRouter(),
    checkPgvector(),
    getRlsPolicyCount(),
    getRowCount(),
  ]);

  const timestamp = new Date().toISOString();
  const allOk =
    aurora === "connected" &&
    openrouter === "connected" &&
    pgvectorResult.status === "connected";
  const status: HealthResponse["status"] = allOk ? "ok" : "degraded";

  const body: HealthResponse = {
    status,
    services: {
      aurora,
      openrouter,
      pgvector: pgvectorResult.status,
    },
    database: {
      rlsPolicies,
      rowCount,
      pgvectorVersion: pgvectorResult.version,
    },
    timestamp,
  };

  return NextResponse.json(body, {
    status: status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
