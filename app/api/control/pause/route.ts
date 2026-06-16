import { NextRequest, NextResponse } from "next/server";
import { pauseAgentExecution } from "@/lib/db/emergency-controls";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getTenantId(request: NextRequest): string | null {
  const id = request.headers.get("x-tenant-id");
  if (!id || !UUID_PATTERN.test(id)) return null;
  return id;
}

interface PauseBody {
  reason: string;
  pausedBy: string;
}

function parsePauseBody(value: unknown): PauseBody | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.reason !== "string" || v.reason.trim().length === 0) return null;
  if (typeof v.pausedBy !== "string" || v.pausedBy.trim().length === 0) return null;
  return { reason: v.reason.trim(), pausedBy: v.pausedBy.trim() };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = parsePauseBody(rawBody);
  if (!body) {
    return NextResponse.json({ error: "reason and pausedBy are required" }, { status: 400 });
  }

  try {
    const control = await pauseAgentExecution(tenantId, body.reason, body.pausedBy);
    return NextResponse.json(control);
  } catch (error) {
    console.error("POST /api/control/pause failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
