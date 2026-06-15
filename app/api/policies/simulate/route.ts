import { NextRequest, NextResponse } from "next/server";
import { getPoliciesByTenant } from "@/lib/db/queries";
import { evaluatePolicy, type AgentActionInput } from "@/lib/ai/policy-engine";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SimulateRequestBody {
  action: AgentActionInput;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSimulateBody(value: unknown): SimulateRequestBody | null {
  if (!isPlainObject(value)) return null;

  const action = value.action;
  if (!isPlainObject(action)) return null;
  if (typeof action.inputSummary !== "string" || typeof action.outputSummary !== "string") {
    return null;
  }

  let costUsd: number | null | undefined;
  if (action.costUsd !== undefined) {
    if (action.costUsd !== null && typeof action.costUsd !== "number") return null;
    costUsd = action.costUsd;
  }

  return {
    action: {
      inputSummary: action.inputSummary,
      outputSummary: action.outputSummary,
      inputMetadata: {},
      outputMetadata: {},
      costUsd,
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = parseSimulateBody(rawBody);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid request body: action.inputSummary and action.outputSummary are required strings" },
      { status: 400 }
    );
  }

  try {
    const policies = await getPoliciesByTenant(tenantId, true);
    const evaluation = evaluatePolicy(body.action, policies);
    return NextResponse.json(evaluation);
  } catch (error) {
    console.error("POST /api/policies/simulate failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
