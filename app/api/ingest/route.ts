import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/ai/embedder";
import { evaluatePolicy, type AgentActionInput } from "@/lib/ai/policy-engine";
import {
  getAgentById,
  getPoliciesByTenant,
  getActionsWithAgentName,
  insertAgentAction,
} from "@/lib/db/queries";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface IngestRequestBody {
  agentId: string;
  actionType: string;
  inputSummary: string;
  inputMetadata: Record<string, unknown>;
  outputSummary: string;
  outputMetadata: Record<string, unknown>;
  costUsd: number | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseIngestBody(value: unknown): IngestRequestBody | null {
  if (!isPlainObject(value)) return null;

  if (typeof value.agentId !== "string" || value.agentId.length === 0) return null;
  if (typeof value.actionType !== "string" || value.actionType.length === 0) return null;
  if (typeof value.inputSummary !== "string") return null;
  if (typeof value.outputSummary !== "string") return null;

  let costUsd: number | null = null;
  if (value.costUsd !== undefined) {
    if (typeof value.costUsd !== "number" || !Number.isFinite(value.costUsd)) return null;
    costUsd = value.costUsd;
  }

  return {
    agentId: value.agentId,
    actionType: value.actionType,
    inputSummary: value.inputSummary,
    inputMetadata: isPlainObject(value.inputMetadata) ? value.inputMetadata : {},
    outputSummary: value.outputSummary,
    outputMetadata: isPlainObject(value.outputMetadata) ? value.outputMetadata : {},
    costUsd,
  };
}

function getTenantId(request: NextRequest): string | null {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) return null;
  return tenantId;
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

  const body = parseIngestBody(rawBody);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const agent = await getAgentById(tenantId, body.agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found for tenant" }, { status: 404 });
    }

    const activePolicies = await getPoliciesByTenant(tenantId, true);

    const actionInput: AgentActionInput = {
      inputSummary: body.inputSummary,
      outputSummary: body.outputSummary,
      inputMetadata: body.inputMetadata,
      outputMetadata: body.outputMetadata,
      costUsd: body.costUsd,
    };

    const evaluation = evaluatePolicy(actionInput, activePolicies);

    if (evaluation.result === "blocked") {
      const action = await insertAgentAction({
        tenant_id: tenantId,
        agent_id: body.agentId,
        action_type: body.actionType,
        input_summary: body.inputSummary,
        input_metadata: body.inputMetadata,
        output_summary: body.outputSummary,
        output_metadata: body.outputMetadata,
        policy_id: evaluation.matchedPolicyId ?? null,
        policy_result: "blocked",
        cost_usd: body.costUsd,
        embedding: null,
      });

      return NextResponse.json(
        {
          blocked: true,
          reason: evaluation.reason ?? "Blocked by policy",
          policyId: evaluation.matchedPolicyId ?? null,
          actionId: action.id,
        },
        { status: 403 }
      );
    }

    const embedding = await embedText(`${body.inputSummary} | ${body.outputSummary}`);

    const action = await insertAgentAction({
      tenant_id: tenantId,
      agent_id: body.agentId,
      action_type: body.actionType,
      input_summary: body.inputSummary,
      input_metadata: body.inputMetadata,
      output_summary: body.outputSummary,
      output_metadata: body.outputMetadata,
      policy_id: evaluation.matchedPolicyId ?? null,
      policy_result: evaluation.result,
      cost_usd: body.costUsd,
      embedding,
    });

    return NextResponse.json({
      id: action.id,
      policyResult: action.policy_result,
    });
  } catch (error) {
    console.error("POST /api/ingest failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  try {
    const actions = await getActionsWithAgentName(tenantId, 100);
    return NextResponse.json({ actions });
  } catch (error) {
    console.error("GET /api/ingest failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
